import base64
import json
import tempfile
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import yaml
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from ultralytics import YOLO
except Exception:  # pragma: no cover
    YOLO = None


APP_DIR = Path(__file__).resolve().parent
MODEL_PATH = APP_DIR / "best.pt"
DATA_YAML_PATH = APP_DIR / "data.yaml"
PRICING_PATH = APP_DIR / "tradein_pricing.json"

VISUAL_PERCENT_DEDUCTIONS = {
    "Cracked": 0.12,
    "Scratch": 0.04,
    "Stain": 0.02,
    "Oil-1": 0.025,
    "Oil-2": 0.035,
}

FUNCTION_PERCENT_DEDUCTIONS = {
    "camera": 0.06,
    "speaker": 0.04,
    "charging_port": 0.05,
    "screen_replaced": 0.03,
    "device_opened": 0.04,
}

FUNCTION_LABELS = {
    "camera": "Camera c\u00f3 l\u1ed7i",
    "speaker": "Loa c\u00f3 l\u1ed7i",
    "charging_port": "C\u1ed5ng s\u1ea1c c\u00f3 l\u1ed7i",
    "screen_replaced": "M\u00e0n h\u00ecnh \u0111\u00e3 thay",
    "device_opened": "M\u00e1y \u0111\u00e3 t\u1eebng m\u1edf",
}

BATTERY_THRESHOLD = 85
BATTERY_PERCENT_PER_POINT = 0.0035

app = FastAPI(
    title="HomeTech Trade-In AI",
    description="Nhan dien loi ngoai hinh dien thoai va de xuat gia thu cu doi moi.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class BrandEntry(BaseModel):
    id: str
    name: str


class PhoneTypeEntry(BaseModel):
    id: str
    brand_id: str
    name: str


class ConditionEntry(BaseModel):
    id: str
    name: str
    description: str = ""
    health_percent: float = 0


class DeviceEntry(BaseModel):
    id: int | None = None
    brand_id: str
    phone_type_id: str
    model: str
    display_name: str | None = None
    storage_options: dict[str, int] = Field(default_factory=dict)
    base_price: int
    floor_price: int
    ceiling_price: int
    condition_prices: dict[str, int] = Field(default_factory=dict)


class BatteryDeductionEntry(BaseModel):
    threshold: int = 85
    percent_per_point: float = 0.0035


class DeductionSettingsEntry(BaseModel):
    visual: dict[str, float] = Field(default_factory=dict)
    functional: dict[str, float] = Field(default_factory=dict)
    battery: BatteryDeductionEntry = Field(default_factory=BatteryDeductionEntry)


class PricingPayload(BaseModel):
    brands: list[BrandEntry]
    phone_types: list[PhoneTypeEntry]
    conditions: list[ConditionEntry]
    devices: list[DeviceEntry]
    deduction_settings: DeductionSettingsEntry = Field(default_factory=DeductionSettingsEntry)


_model_instance = None
_class_names: list[str] = []


def default_pricing_payload() -> dict[str, Any]:
    return {
        "brands": [
            {"id": "apple", "name": "Apple"},
            {"id": "samsung", "name": "Samsung"},
        ],
        "phone_types": [
            {"id": "iphone", "brand_id": "apple", "name": "iPhone"},
            {"id": "galaxy-s", "brand_id": "samsung", "name": "Galaxy S"},
        ],
        "conditions": [
            {
                "id": "excellent",
                "name": "Xuất sắc",
                "description": "Máy đẹp, ngoại hình rất mới, các chức năng hoạt động ổn định.",
                "health_percent": 90,
            },
            {
                "id": "good",
                "name": "Tốt",
                "description": "Máy có một vài vết nhẹ, pin và các tính năng vẫn sử dụng tốt.",
                "health_percent": 75,
            },
            {
                "id": "fair",
                "name": "Trung bình",
                "description": "Máy có nhiều vết xước hoặc một vài dấu hiệu hao mòn rõ ràng.",
                "health_percent": 50,
            },
            {
                "id": "poor",
                "name": "Kém",
                "description": "Máy có nhiều lỗi ngoại hình, cần xem xét kỹ trước khi thu cũ đổi mới.",
                "health_percent": 0,
            },
        ],
        "deduction_settings": {
            "visual": VISUAL_PERCENT_DEDUCTIONS,
            "functional": FUNCTION_PERCENT_DEDUCTIONS,
            "battery": {
                "threshold": BATTERY_THRESHOLD,
                "percent_per_point": BATTERY_PERCENT_PER_POINT,
            },
        },
        "devices": [
            {
                "id": 1,
                "brand_id": "apple",
                "phone_type_id": "iphone",
                "model": "iphone-13",
                "display_name": "iPhone 13",
                "storage_options": {"128GB": 0, "256GB": 1200000, "512GB": 2500000},
                "base_price": 9200000,
                "floor_price": 4200000,
                "ceiling_price": 10800000,
                "condition_prices": {
                    "excellent": 9200000,
                    "good": 8460000,
                    "fair": 7540000,
                    "poor": 6250000,
                },
            },
            {
                "id": 2,
                "brand_id": "apple",
                "phone_type_id": "iphone",
                "model": "iphone-14-pro",
                "display_name": "iPhone 14 Pro",
                "storage_options": {"128GB": 0, "256GB": 1500000, "512GB": 3200000},
                "base_price": 15600000,
                "floor_price": 7600000,
                "ceiling_price": 18400000,
                "condition_prices": {
                    "excellent": 15600000,
                    "good": 14500000,
                    "fair": 13100000,
                    "poor": 10900000,
                },
            },
            {
                "id": 3,
                "brand_id": "samsung",
                "phone_type_id": "galaxy-s",
                "model": "samsung-s23",
                "display_name": "Samsung Galaxy S23",
                "storage_options": {"128GB": -600000, "256GB": 0, "512GB": 1800000},
                "base_price": 11400000,
                "floor_price": 5400000,
                "ceiling_price": 13200000,
                "condition_prices": {
                    "excellent": 11400000,
                    "good": 10300000,
                    "fair": 9200000,
                    "poor": 7520000,
                },
            },
        ],
    }


def normalize_catalog_relations(data: dict[str, Any]) -> dict[str, Any]:
    brands = data.get("brands", [])
    phone_types = data.get("phone_types", [])
    devices = data.get("devices", [])

    valid_brand_ids = {item.get("id") for item in brands if item.get("id")}
    fallback_brand_id = next(iter(valid_brand_ids), "")

    for phone_type in phone_types:
        brand_id = phone_type.get("brand_id")
        if brand_id not in valid_brand_ids:
            phone_type["brand_id"] = fallback_brand_id

    phone_type_brand_map = {
        item.get("id"): item.get("brand_id")
        for item in phone_types
        if item.get("id")
    }
    fallback_phone_type_id = next(iter(phone_type_brand_map.keys()), "")

    normalized_devices = []
    for device in devices:
        phone_type_id = device.get("phone_type_id")
        if phone_type_id not in phone_type_brand_map:
            if not fallback_phone_type_id:
                continue
            phone_type_id = fallback_phone_type_id
            device["phone_type_id"] = fallback_phone_type_id

        device["brand_id"] = phone_type_brand_map.get(phone_type_id, fallback_brand_id)
        normalized_devices.append(device)

    data["devices"] = normalized_devices
    return data


def load_class_names() -> list[str]:
    if not DATA_YAML_PATH.exists():
        return ["Cracked", "Oil-1", "Oil-2", "Scratch", "Stain"]

    with DATA_YAML_PATH.open("r", encoding="utf-8") as file:
        data = yaml.safe_load(file) or {}
    names = data.get("names", [])
    return [str(name) for name in names] if names else ["Cracked", "Oil-1", "Oil-2", "Scratch", "Stain"]


def get_model():
    global _model_instance, _class_names
    if not _class_names:
        _class_names = load_class_names()

    if _model_instance is None:
        if YOLO is None:
            raise RuntimeError("Ultralytics chua duoc cai dat trong moi truong hien tai.")
        if not MODEL_PATH.exists():
            raise RuntimeError(f"Khong tim thay model tai {MODEL_PATH}")
        _model_instance = YOLO(str(MODEL_PATH))
    return _model_instance


def ensure_pricing_file() -> None:
    if PRICING_PATH.exists():
        return
    default_payload = default_pricing_payload()
    with PRICING_PATH.open("w", encoding="utf-8") as file:
        json.dump(default_payload, file, ensure_ascii=False, indent=2)


def read_pricing() -> dict[str, Any]:
    ensure_pricing_file()
    with PRICING_PATH.open("r", encoding="utf-8-sig") as file:
        data = json.load(file)

    default_data = default_pricing_payload()
    for key in ("brands", "phone_types", "conditions", "devices"):
        if not data.get(key):
            data[key] = default_data[key]
    if not data.get("deduction_settings"):
        data["deduction_settings"] = default_data["deduction_settings"]
    data = normalize_catalog_relations(data)

    deduction_settings = data.setdefault("deduction_settings", {})
    deduction_settings["visual"] = {
        key: float(value)
        for key, value in deduction_settings.get("visual", VISUAL_PERCENT_DEDUCTIONS).items()
    }
    deduction_settings["functional"] = {
        key: float(value)
        for key, value in deduction_settings.get("functional", FUNCTION_PERCENT_DEDUCTIONS).items()
    }
    battery_settings = deduction_settings.setdefault("battery", {})
    battery_settings["threshold"] = int(battery_settings.get("threshold", BATTERY_THRESHOLD))
    battery_settings["percent_per_point"] = float(
        battery_settings.get("percent_per_point", BATTERY_PERCENT_PER_POINT)
    )

    default_health_percents = [90, 75, 50, 0]
    for index, condition in enumerate(data.get("conditions", [])):
        condition.pop("min_score", None)
        condition.pop("max_score", None)
        condition.setdefault("id", f"condition-{index + 1}")
        condition.setdefault("name", f"Tinh trang {index + 1}")
        condition.setdefault("description", "")
        condition["health_percent"] = float(
            condition.get(
                "health_percent",
                default_health_percents[index] if index < len(default_health_percents) else 0,
            )
        )

    for index, device in enumerate(data.get("devices", [])):
        device["id"] = index + 1
        device.setdefault("display_name", device.get("model", f"device-{index + 1}"))
        if "condition_prices" not in device:
            rates = device.pop("condition_rates", {})
            condition_prices = {}
            for condition in data.get("conditions", []):
                condition_id = condition["id"]
                rate = float(rates.get(condition_id, 1))
                condition_prices[condition_id] = int(device.get("base_price", 0) * rate)
            device["condition_prices"] = condition_prices
        else:
            device["condition_prices"] = {
                key: int(value) for key, value in device.get("condition_prices", {}).items()
            }

    with PRICING_PATH.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)

    return data


def write_pricing(payload: PricingPayload) -> dict[str, Any]:
    data = payload.model_dump()
    data = normalize_catalog_relations(data)
    deduction_settings = data.setdefault("deduction_settings", {})
    deduction_settings["visual"] = {
        key: float(value) for key, value in deduction_settings.get("visual", {}).items()
    }
    deduction_settings["functional"] = {
        key: float(value) for key, value in deduction_settings.get("functional", {}).items()
    }
    battery_settings = deduction_settings.setdefault("battery", {})
    battery_settings["threshold"] = int(battery_settings.get("threshold", BATTERY_THRESHOLD))
    battery_settings["percent_per_point"] = float(
        battery_settings.get("percent_per_point", BATTERY_PERCENT_PER_POINT)
    )
    for index, device in enumerate(data.get("devices", [])):
        device["id"] = index + 1
        device["display_name"] = device.get("display_name") or device.get("model", f"device-{index + 1}")
    with PRICING_PATH.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    return data


def decode_image(data: bytes) -> np.ndarray:
    frame = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="File anh khong hop le.")
    return frame


def encode_image(frame: np.ndarray) -> str:
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 88])
    if not ok:
        return ""
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def detect_damage(frame: np.ndarray, side: str) -> dict[str, Any]:
    model = get_model()
    results = model.predict(frame, conf=0.25, iou=0.5, verbose=False)
    result = results[0]
    annotated = result.plot()
    detections = []
    counts: dict[str, int] = {}

    boxes = getattr(result, "boxes", None)
    if boxes is not None:
        for box in boxes:
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
            label = _class_names[cls_id] if cls_id < len(_class_names) else f"class-{cls_id}"
            counts[label] = counts.get(label, 0) + 1
            detections.append(
                {
                    "label": label,
                    "confidence": round(conf, 4),
                    "side": side,
                    "bbox": [x1, y1, x2, y2],
                }
            )

    severity = sum(VISUAL_PERCENT_DEDUCTIONS.get(item["label"], 0.015) for item in detections)
    return {
        "side": side,
        "detections": detections,
        "counts": counts,
        "severity": round(min(severity, 0.45), 4),
        "annotated_image": encode_image(annotated),
    }


def calculate_stacked_percent(base_percent: float, count: int) -> float:
    applied_count = min(max(count, 0), 2)
    return base_percent * applied_count


def build_visual_deductions(
    image_results: list[dict[str, Any]], ceiling_price: int, settings: dict[str, float]
) -> tuple[list[dict[str, Any]], float, int]:
    aggregated_counts: dict[str, int] = {}
    for item in image_results:
        for label, count in item.get("counts", {}).items():
            aggregated_counts[label] = aggregated_counts.get(label, 0) + int(count)

    breakdown = []
    total_percent = 0.0
    total_amount = 0

    for label, count in sorted(aggregated_counts.items()):
        base_percent = float(settings.get(label, 0.015))
        applied_percent = calculate_stacked_percent(base_percent, count)
        amount = int(round(ceiling_price * applied_percent))
        total_percent += applied_percent
        total_amount += amount
        breakdown.append(
            {
                "label": label,
                "count": count,
                "count_used_for_pricing": min(count, 2),
                "unit_percent": round(base_percent, 4),
                "applied_percent": round(applied_percent, 4),
                "amount": amount,
                "rule": "Mỗi loại lỗi chỉ tính tối đa 2 lần khi khấu trừ.",
            }
        )

    return breakdown, total_percent, total_amount


def build_function_deductions(
    checks: dict[str, bool], ceiling_price: int, settings: dict[str, float]
) -> tuple[list[dict[str, Any]], float, int]:
    breakdown = []
    total_percent = 0.0
    total_amount = 0

    for key, enabled in checks.items():
        if not enabled:
            continue
        base_percent = float(settings.get(key, 0.0))
        amount = int(round(ceiling_price * base_percent))
        total_percent += base_percent
        total_amount += amount
        breakdown.append(
            {
                "key": key,
                "label": FUNCTION_LABELS.get(key, key),
                "applied_percent": round(base_percent, 4),
                "amount": amount,
            }
        )

    return breakdown, total_percent, total_amount


def build_battery_deduction(
    battery_health: int, ceiling_price: int, threshold: int, percent_per_point: float
) -> tuple[dict[str, Any], float, int]:
    if battery_health >= threshold:
        return {
            "threshold": threshold,
            "battery_health": battery_health,
            "below_threshold": 0,
            "applied_percent": 0.0,
            "amount": 0,
        }, 0.0, 0

    below_threshold = threshold - battery_health
    applied_percent = below_threshold * percent_per_point
    amount = int(round(ceiling_price * applied_percent))
    return {
        "threshold": threshold,
        "battery_health": battery_health,
        "below_threshold": below_threshold,
        "applied_percent": round(applied_percent, 4),
        "amount": amount,
    }, applied_percent, amount


def find_condition(conditions: list[dict[str, Any]], score: float) -> dict[str, Any]:
    if not conditions:
        return {"id": "unknown", "name": "Khong ro", "description": ""}

    sorted_conditions = sorted(
        conditions,
        key=lambda item: float(item.get("health_percent", 0)),
        reverse=True,
    )

    for condition in sorted_conditions:
        threshold = float(condition.get("health_percent", 0)) / 100
        if score >= threshold:
            return condition

    return sorted_conditions[-1]


def build_quote(
    pricing_data: dict[str, Any],
    model_name: str,
    storage: str,
    battery_health: int,
    checks: dict[str, bool],
    image_results: list[dict[str, Any]],
) -> dict[str, Any]:
    devices = pricing_data.get("devices", [])
    selected = next((item for item in devices if item["model"] == model_name), None)
    if selected is None:
        raise HTTPException(status_code=404, detail="Khong tim thay bang gia cho dong may nay.")

    storage_adjustment = selected.get("storage_options", {}).get(storage, 0)
    base_price = int(selected["base_price"]) + int(storage_adjustment)
    floor_price = int(selected["floor_price"])
    ceiling_price = int(selected["ceiling_price"]) + int(storage_adjustment)
    deduction_settings = pricing_data.get("deduction_settings", {})
    visual_settings = deduction_settings.get("visual", VISUAL_PERCENT_DEDUCTIONS)
    functional_settings = deduction_settings.get("functional", FUNCTION_PERCENT_DEDUCTIONS)
    battery_settings = deduction_settings.get("battery", {})

    visual_breakdown, visual_penalty_percent, visual_deduction_amount = build_visual_deductions(
        image_results, ceiling_price, visual_settings
    )
    function_breakdown, function_penalty_percent, function_deduction_amount = build_function_deductions(
        checks, ceiling_price, functional_settings
    )
    battery_breakdown, battery_penalty_percent, battery_deduction_amount = build_battery_deduction(
        battery_health,
        ceiling_price,
        int(battery_settings.get("threshold", BATTERY_THRESHOLD)),
        float(battery_settings.get("percent_per_point", BATTERY_PERCENT_PER_POINT)),
    )

    total_penalty_percent = visual_penalty_percent + function_penalty_percent + battery_penalty_percent
    total_deduction_amount = (
        visual_deduction_amount + function_deduction_amount + battery_deduction_amount
    )
    health_score = max(0.15, 1 - total_penalty_percent)

    matched_condition = find_condition(pricing_data.get("conditions", []), health_score)
    suggested_before_floor = ceiling_price - total_deduction_amount
    suggested = max(floor_price, min(int(suggested_before_floor), ceiling_price))

    min_offer = max(floor_price, int(suggested * 0.94))
    max_offer = min(ceiling_price, int(suggested * 1.06))

    brand = next((item for item in pricing_data.get("brands", []) if item["id"] == selected.get("brand_id")), None)
    phone_type = next((item for item in pricing_data.get("phone_types", []) if item["id"] == selected.get("phone_type_id")), None)

    return {
        "brand": brand["name"] if brand else "",
        "phone_type": phone_type["name"] if phone_type else "",
        "model": selected.get("display_name") or selected["model"],
        "model_code": selected["model"],
        "storage": storage,
        "base_price": base_price,
        "condition": matched_condition,
        "health_score": round(health_score, 4),
        "battery_health": battery_health,
        "pricing_method": {
            "label": "Gia tran - khau tru ngoai hinh - khau tru chuc nang - khau tru pin",
            "ceiling_price": ceiling_price,
            "floor_price": floor_price,
            "base_price": base_price,
            "storage_adjustment": int(storage_adjustment),
            "suggested_before_floor": int(suggested_before_floor),
        },
        "deductions": {
            "visual_percent": round(visual_penalty_percent, 4),
            "functional_percent": round(function_penalty_percent, 4),
            "battery_percent": round(battery_penalty_percent, 4),
            "total_percent": round(total_penalty_percent, 4),
            "visual_amount": visual_deduction_amount,
            "functional_amount": function_deduction_amount,
            "battery_amount": battery_deduction_amount,
            "total_amount": total_deduction_amount,
            "visual_breakdown": visual_breakdown,
            "functional_breakdown": function_breakdown,
            "battery_breakdown": battery_breakdown,
        },
        "offer_range": {
            "min": min_offer,
            "max": max_offer,
            "suggested": suggested,
        },
    }


def parse_bool(value: str) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y", "co"}


def extract_video_findings(video_bytes: bytes, sample_interval: int = 15) -> dict[str, Any]:
    model = get_model()
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_file:
        temp_file.write(video_bytes)
        temp_path = Path(temp_file.name)

    cap = cv2.VideoCapture(str(temp_path))
    if not cap.isOpened():
        temp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Khong mo duoc video.")

    frame_index = 0
    findings = []
    crops = []
    aggregated_counts: dict[str, int] = {}

    try:
        while cap.isOpened():
            ok, frame = cap.read()
            if not ok:
                break
            if frame_index % sample_interval != 0:
                frame_index += 1
                continue

            results = model.predict(frame, conf=0.25, iou=0.5, verbose=False)
            result = results[0]
            boxes = getattr(result, "boxes", None)
            if boxes is None:
                frame_index += 1
                continue

            for box in boxes:
                cls_id = int(box.cls[0].item())
                conf = float(box.conf[0].item())
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
                label = _class_names[cls_id] if cls_id < len(_class_names) else f"class-{cls_id}"
                aggregated_counts[label] = aggregated_counts.get(label, 0) + 1
                findings.append(
                    {
                        "frame_index": frame_index,
                        "label": label,
                        "confidence": round(conf, 4),
                        "bbox": [x1, y1, x2, y2],
                    }
                )
                if len(crops) < 8:
                    crop = frame[max(y1, 0):max(y2, 0), max(x1, 0):max(x2, 0)]
                    if crop.size > 0:
                        crops.append(
                            {
                                "label": label,
                                "frame_index": frame_index,
                                "image": encode_image(crop),
                            }
                        )
            frame_index += 1
    finally:
        cap.release()
        temp_path.unlink(missing_ok=True)

    return {
        "frames_analyzed": frame_index,
        "counts": aggregated_counts,
        "findings": findings,
        "crops": crops,
    }


@app.on_event("startup")
def startup_event() -> None:
    ensure_pricing_file()
    load_class_names()


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model_path": str(MODEL_PATH),
        "pricing_path": str(PRICING_PATH),
        "class_names": _class_names or load_class_names(),
    }


@app.get("/pricing")
def get_pricing() -> dict[str, Any]:
    return read_pricing()


@app.post("/pricing")
def save_pricing(payload: PricingPayload) -> dict[str, Any]:
    data = write_pricing(payload)
    return {"message": "Da cap nhat danh muc va bang gia thu cu doi moi.", "data": data}


@app.post("/analyze/images")
async def analyze_images(
    model_name: str = Form(...),
    storage: str = Form(...),
    battery_health: int = Form(...),
    camera_issue: str = Form("false"),
    speaker_issue: str = Form("false"),
    charging_port_issue: str = Form("false"),
    screen_replaced: str = Form("false"),
    device_opened: str = Form("false"),
    front_image: UploadFile = File(...),
    back_image: UploadFile = File(...),
) -> dict[str, Any]:
    front_frame = decode_image(await front_image.read())
    back_frame = decode_image(await back_image.read())

    image_results = [
        detect_damage(front_frame, "front"),
        detect_damage(back_frame, "back"),
    ]

    pricing = read_pricing()
    checks = {
        "camera": parse_bool(camera_issue),
        "speaker": parse_bool(speaker_issue),
        "charging_port": parse_bool(charging_port_issue),
        "screen_replaced": parse_bool(screen_replaced),
        "device_opened": parse_bool(device_opened),
    }
    quote = build_quote(pricing, model_name, storage, battery_health, checks, image_results)

    return {
        "quote": quote,
        "checks": checks,
        "image_results": image_results,
        "summary": {
            "total_detected_issues": sum(len(item["detections"]) for item in image_results),
            "sides_with_damage": [item["side"] for item in image_results if item["detections"]],
        },
    }


@app.post("/analyze/video")
async def analyze_video(
    file: UploadFile = File(...),
    sample_interval: int = Form(15),
) -> dict[str, Any]:
    video_bytes = await file.read()
    if not video_bytes:
        raise HTTPException(status_code=400, detail="Video rong.")
    result = extract_video_findings(video_bytes, sample_interval=max(sample_interval, 1))
    return result
