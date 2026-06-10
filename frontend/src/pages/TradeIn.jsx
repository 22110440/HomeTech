import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { tradeInAPI, userAPI } from '../services/api';
import styles from './TradeIn.module.css';

const issueFields = [
  { key: 'camera_issue', label: 'Camera có lỗi' },
  { key: 'speaker_issue', label: 'Loa có lỗi' },
  { key: 'charging_port_issue', label: 'Cổng sạc có lỗi' },
  { key: 'screen_replaced', label: 'Màn hình đã thay' },
  { key: 'device_opened', label: 'Máy đã từng mở' },
];

const functionalLabels = {
  camera: 'Camera có lỗi',
  speaker: 'Loa có lỗi',
  charging_port: 'Cổng sạc có lỗi',
  screen_replaced: 'Màn hình đã thay',
  device_opened: 'Máy đã từng mở',
};

const visualLabels = {
  Cracked: 'Nứt vỡ',
  Scratch: 'Trầy xước',
  Stain: 'Ố bẩn',
  'Oil-1': 'Loang màu mức 1',
  'Oil-2': 'Loang màu mức 2',
};

const initialForm = {
  brand_id: '',
  phone_type_id: '',
  model_name: '',
  storage: '',
  battery_health: 85,
  camera_issue: false,
  speaker_issue: false,
  charging_port_issue: false,
  screen_replaced: false,
  device_opened: false,
  front_image: null,
  back_image: null,
  video: null,
};

const initialAppointmentForm = {
  customerName: '',
  phone: '',
  appointmentDate: '',
  appointmentTime: '',
  note: '',
};

function getWeekValueFromDate(dateValue) {
  if (!dateValue) return '';
  const [year, month, day] = String(dateValue).split('-').map(Number);
  if (!year || !month || !day) return '';

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return '';

  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function base64Src(value) {
  return value ? `data:image/jpeg;base64,${value}` : '';
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatNumberDisplay(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? new Intl.NumberFormat('vi-VN').format(number) : '0';
}

function parseNumberInput(value) {
  const normalized = String(value || '').replace(/\./g, '').replace(/[^\d-]/g, '');
  if (!normalized || normalized === '-') return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toInteger(value, fallback = 0) {
  return Math.round(toFiniteNumber(value, fallback));
}

function getTradeInErrorMessage(error) {
  const data = error?.response?.data;

  if (Array.isArray(data?.detail)) {
    const messages = data.detail
      .map((item) => {
        const path = Array.isArray(item.loc)
          ? item.loc.filter((part) => part !== 'body').join('.')
          : '';
        return path ? `${path}: ${item.msg}` : item.msg;
      })
      .filter(Boolean);

    return messages.length ? messages.join('; ') : 'Không lưu được danh mục và bảng giá.';
  }

  if (typeof data?.detail === 'string') return data.detail;
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.message === 'string') return data.message;
  if (typeof data === 'string') return data;
  if (error?.message) return error.message;

  return 'Không lưu được danh mục và bảng giá.';
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `item-${Date.now()}`;
}

function createTempId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function createEmptyPricingState() {
  return {
    brands: [],
    phone_types: [],
    conditions: [],
    devices: [],
    deduction_settings: {
      visual: {
        Cracked: 0.12,
        Scratch: 0.04,
        Stain: 0.02,
        'Oil-1': 0.025,
        'Oil-2': 0.035,
      },
      functional: {
        camera: 0.06,
        speaker: 0.04,
        charging_port: 0.05,
        screen_replaced: 0.03,
        device_opened: 0.04,
      },
      battery: {
        threshold: 85,
        percent_per_point: 0.0035,
      },
    },
  };
}

function createBrand() {
  return { id: createTempId('brand'), name: '' };
}

function createPhoneType() {
  return { id: createTempId('type'), brand_id: '', name: '' };
}

function createCondition() {
  return { id: createTempId('condition'), name: '', description: '', health_percent: 0 };
}

function createDevice() {
  return {
    id: null,
    brand_id: '',
    phone_type_id: '',
    model: '',
    storage_options: { '128GB': 0 },
    base_price: 0,
    floor_price: 0,
    ceiling_price: 0,
    condition_prices: {},
  };
}

function getPhoneTypesForBrand(phoneTypes, brandId) {
  return phoneTypes.filter((item) => item.brand_id === brandId);
}

function normalizeDraftRelations(state) {
  const brands = state.brands || [];
  const phoneTypes = state.phone_types || [];
  const validBrandIds = new Set(brands.map((item) => item.id));
  const fallbackBrandId = brands[0]?.id || '';

  const normalizedPhoneTypes = phoneTypes.map((item) => ({
    ...item,
    brand_id: validBrandIds.has(item.brand_id) ? item.brand_id : fallbackBrandId,
  }));

  const phoneTypeMap = new Map(normalizedPhoneTypes.map((item) => [item.id, item]));
  const fallbackPhoneTypeId = normalizedPhoneTypes[0]?.id || '';

  const normalizedDevices = (state.devices || []).map((device) => {
    let phoneType = phoneTypeMap.get(device.phone_type_id);

    if (!phoneType) {
      const typesForBrand = getPhoneTypesForBrand(normalizedPhoneTypes, device.brand_id);
      phoneType = typesForBrand[0] || phoneTypeMap.get(fallbackPhoneTypeId);
    }

    const nextPhoneTypeId = phoneType?.id || '';
    const nextBrandId = phoneType?.brand_id || fallbackBrandId;

    return {
      ...device,
      brand_id: nextBrandId,
      phone_type_id: nextPhoneTypeId,
    };
  });

  return {
    ...state,
    phone_types: normalizedPhoneTypes,
    devices: normalizedDevices,
  };
}

export default function TradeIn({ adminOnly = false }) {
  const navigate = useNavigate();
  const isAdminView = adminOnly;
  const [catalog, setCatalog] = useState(createEmptyPricingState());
  const [draft, setDraft] = useState(createEmptyPricingState());
  const [form, setForm] = useState(initialForm);
  const [analysis, setAnalysis] = useState(null);
  const [videoAnalysis, setVideoAnalysis] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [appointmentForm, setAppointmentForm] = useState(initialAppointmentForm);
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [appointmentMessage, setAppointmentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadCatalog();
    loadUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUserInfo() {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const response = await api.get('/auth/user-info');
      if (!response.data?.success) return;
      const currentUser = response.data.data;
      setUserInfo(currentUser);
      setAppointmentForm((current) => ({
        ...current,
        customerName: current.customerName || currentUser?.fullName || currentUser?.username || '',
        phone: current.phone || currentUser?.phone || '',
      }));
    } catch (err) {
      console.error('Không thể tải thông tin người dùng cho lịch thu cũ đổi mới', err);
    }
  }

  async function loadCatalog() {
    try {
      const response = await tradeInAPI.getPricing();
      const normalized = {
        brands: response.brands || [],
        phone_types: response.phone_types || [],
        conditions: response.conditions || [],
        devices: response.devices || [],
        deduction_settings: {
          visual: {
            ...createEmptyPricingState().deduction_settings.visual,
            ...(response.deduction_settings?.visual || {}),
          },
          functional: {
            ...createEmptyPricingState().deduction_settings.functional,
            ...(response.deduction_settings?.functional || {}),
          },
          battery: {
            ...createEmptyPricingState().deduction_settings.battery,
            ...(response.deduction_settings?.battery || {}),
          },
        },
      };
      setCatalog(normalized);
      setDraft(normalized);
      setDefaultSelections(normalized);
    } catch {
      setError('Không tải được danh mục thu cũ đổi mới. Hãy chạy FastAPI trước.');
    }
  }

  function setDefaultSelections(data) {
    const firstBrand = data.brands[0];
    const firstPhoneType = data.phone_types.find((item) => item.brand_id === firstBrand?.id) || data.phone_types[0];
    const firstDevice = data.devices.find((item) => item.phone_type_id === firstPhoneType?.id) || data.devices[0];
    const firstStorage = Object.keys(firstDevice?.storage_options || {})[0] || '';

    setForm((current) => ({
      ...current,
      brand_id: current.brand_id || firstBrand?.id || '',
      phone_type_id: current.phone_type_id || firstPhoneType?.id || '',
      model_name: current.model_name || firstDevice?.model || '',
      storage: current.storage || firstStorage,
    }));
  }

  const filteredPhoneTypes = useMemo(
    () => catalog.phone_types.filter((item) => item.brand_id === form.brand_id),
    [catalog.phone_types, form.brand_id]
  );

  const filteredDevices = useMemo(
    () => catalog.devices.filter((item) => item.phone_type_id === form.phone_type_id),
    [catalog.devices, form.phone_type_id]
  );

  const selectedDevice = useMemo(
    () => catalog.devices.find((item) => item.model === form.model_name) || filteredDevices[0],
    [catalog.devices, filteredDevices, form.model_name]
  );

  const storageColumns = useMemo(() => {
    const keys = new Set();
    draft.devices.forEach((device) => {
      Object.keys(device.storage_options || {}).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [draft.devices]);

  useEffect(() => {
    const nextPhoneType = filteredPhoneTypes[0];
    if (form.brand_id && !filteredPhoneTypes.some((item) => item.id === form.phone_type_id)) {
      setForm((current) => ({ ...current, phone_type_id: nextPhoneType?.id || '', model_name: '', storage: '' }));
    }
  }, [filteredPhoneTypes, form.brand_id, form.phone_type_id]);

  useEffect(() => {
    const nextDevice = filteredDevices[0];
    if (form.phone_type_id && !filteredDevices.some((item) => item.model === form.model_name)) {
      setForm((current) => ({
        ...current,
        model_name: nextDevice?.model || '',
        storage: Object.keys(nextDevice?.storage_options || {})[0] || '',
      }));
    }
  }, [filteredDevices, form.model_name, form.phone_type_id]);

  useEffect(() => {
    if (!selectedDevice) return;
    const storages = Object.keys(selectedDevice.storage_options || {});
    if (!storages.includes(form.storage)) {
      setForm((current) => ({ ...current, storage: storages[0] || '' }));
    }
  }, [selectedDevice, form.storage]);

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitAnalysis(event) {
    event.preventDefault();
    setError('');
    setAnalysis(null);

    if (!form.front_image || !form.back_image) {
      setError('Vui lòng tải ảnh mặt trước và mặt sau.');
      return;
    }

    setLoading(true);
    try {
      const response = await tradeInAPI.analyzeTradeInImages({
        model_name: form.model_name,
        storage: form.storage,
        battery_health: String(form.battery_health),
        camera_issue: String(form.camera_issue),
        speaker_issue: String(form.speaker_issue),
        charging_port_issue: String(form.charging_port_issue),
        screen_replaced: String(form.screen_replaced),
        device_opened: String(form.device_opened),
        front_image: form.front_image,
        back_image: form.back_image,
      });
      setAnalysis(response);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Phân tích ảnh thất bại.');
    } finally {
      setLoading(false);
    }
  }

  async function submitVideo() {
    if (!form.video) {
      setError('Vui lòng chọn video quay điện thoại.');
      return;
    }
    setVideoLoading(true);
    setError('');
    try {
      const response = await tradeInAPI.analyzeTradeInVideo(form.video, 12);
      setVideoAnalysis(response);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Phân tích video thất bại.');
    } finally {
      setVideoLoading(false);
    }
  }

  function updateAppointmentForm(key, value) {
    setAppointmentForm((current) => ({ ...current, [key]: value }));
  }

  function buildTradeInFunctionalSummary() {
    const selected = issueFields.filter((item) => form[item.key]).map((item) => item.label);
    return selected.length ? selected.join(', ') : 'Không ghi nhận lỗi chức năng khách hàng khai báo.';
  }

  function buildTradeInVisualSummary() {
    const breakdown = analysis?.quote?.deductions?.visual_breakdown || [];
    if (!breakdown.length) {
      return 'Không phát hiện lỗi ngoại hình từ ảnh phân tích.';
    }
    return breakdown
      .map((item) => `${visualLabels[item.label] || item.label}: ${item.count} lỗi`)
      .join(', ');
  }

  async function submitTradeInAppointment(event) {
    event.preventDefault();
    if (!analysis?.quote) {
      setError('Cần có kết quả phân tích trước khi đặt lịch thu cũ đổi mới.');
      return;
    }
    if (!userInfo?.id) {
      setError('Vui lòng đăng nhập để đặt lịch thu cũ đổi mới.');
      return;
    }

    setAppointmentLoading(true);
    setAppointmentMessage('');
    setError('');
    let redirectUrl = '';
    try {
      const videoDataUrl = form.video ? await fileToDataUrl(form.video) : '';
      const payload = {
        customerId: userInfo.id,
        customerName: appointmentForm.customerName,
        phone: appointmentForm.phone,
        deviceModel: analysis.quote.model,
        appointmentDate: appointmentForm.appointmentDate,
        appointmentTime: appointmentForm.appointmentTime,
        note:
          appointmentForm.note ||
          `Khách đặt lịch thu cũ đổi mới cho ${analysis.quote.model}. Giá AI ước lượng ${formatCurrency(analysis.quote.offer_range?.suggested)}.`,
        paymentMethod: 'COD',
        bookingType: 'TRADE_IN',
        estimatedTradeInAmount: Number(analysis.quote.offer_range?.suggested || 0),
        tradeInHealthScore: Number(analysis.quote.health_score || 0),
        tradeInOfferRangeMin: Number(analysis.quote.offer_range?.min || 0),
        tradeInOfferRangeMax: Number(analysis.quote.offer_range?.max || 0),
        tradeInConditionName: analysis.quote.condition?.name || '',
        tradeInConditionDescription: analysis.quote.condition?.description || '',
        tradeInBatteryHealth: Number(form.battery_health || 0),
        tradeInFunctionalStatus: buildTradeInFunctionalSummary(),
        tradeInVisualStatus: buildTradeInVisualSummary(),
        tradeInAiImageResults: analysis.image_results || [],
        tradeInVideoAnalysis: videoAnalysis || null,
        tradeInVideoDataUrl: videoDataUrl || '',
      };

      const response = await userAPI.createRepairBooking(payload);
      if (!response?.success) {
        throw new Error(response?.error || response?.message || 'Không thể tạo lịch hẹn thu cũ đổi mới.');
      }

      const appointmentDate = appointmentForm.appointmentDate;
      const weekValue = getWeekValueFromDate(appointmentDate);
      const params = new URLSearchParams();
      if (weekValue) params.set('week', weekValue);
      if (appointmentDate) params.set('date', appointmentDate);

      setAppointmentMessage('Đã gửi lịch hẹn thu cũ đổi mới. Thợ sẽ kiểm tra máy và báo giá cụ thể khi tiếp nhận.');
      setAppointmentForm((current) => ({
        ...initialAppointmentForm,
        customerName: current.customerName,
        phone: current.phone,
      }));
      redirectUrl = `/my-repair-schedules${params.toString() ? `?${params.toString()}` : ''}`;
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Không thể tạo lịch hẹn thu cũ đổi mới.');
    } finally {
      setAppointmentLoading(false);
    }

    if (redirectUrl) {
      navigate(redirectUrl);
    }
  }

  function updateDraftSection(section, index, key, value) {
    setDraft((current) => {
      const nextState = {
        ...current,
        [section]: current[section].map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
      };

      if (section === 'devices' && key === 'brand_id') {
        const nextPhoneType = getPhoneTypesForBrand(nextState.phone_types, value)[0] || nextState.phone_types[0];
        nextState.devices = nextState.devices.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                brand_id: value,
                phone_type_id: nextPhoneType?.id || '',
              }
            : item
        );
      }

      if (section === 'devices' && key === 'phone_type_id') {
        const selectedPhoneType = nextState.phone_types.find((item) => item.id === value);
        nextState.devices = nextState.devices.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                phone_type_id: value,
                brand_id: selectedPhoneType?.brand_id || item.brand_id,
              }
            : item
        );
      }

      if (section === 'phone_types' && key === 'brand_id') {
        const phoneTypeId = nextState.phone_types[index]?.id;
        nextState.devices = nextState.devices.map((item) =>
          item.phone_type_id === phoneTypeId ? { ...item, brand_id: value } : item
        );
      }

      return normalizeDraftRelations(nextState);
    });
  }

  function updateDeductionSetting(group, key, value) {
    setDraft((current) => ({
      ...current,
      deduction_settings: {
        ...current.deduction_settings,
        [group]: {
          ...current.deduction_settings[group],
          [key]: Number(value),
        },
      },
    }));
  }

  function updateBatterySetting(key, value) {
    setDraft((current) => ({
      ...current,
      deduction_settings: {
        ...current.deduction_settings,
        battery: {
          ...current.deduction_settings.battery,
          [key]: Number(value),
        },
      },
    }));
  }

  function updateDeviceStorage(index, storageKey, value) {
    setDraft((current) => ({
      ...current,
      devices: current.devices.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              storage_options: {
                ...item.storage_options,
                [storageKey]: parseNumberInput(value),
              },
            }
          : item
      ),
    }));
  }

  function updateDeviceConditionPrice(index, conditionId, value) {
    setDraft((current) => ({
      ...current,
      devices: current.devices.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              condition_prices: {
                ...item.condition_prices,
                [conditionId]: parseNumberInput(value),
              },
            }
          : item
      ),
    }));
  }

  function addBrand() {
    setDraft((current) => ({ ...current, brands: [...current.brands, createBrand()] }));
  }

  function removeBrand(index) {
    setDraft((current) => {
      const brand = current.brands[index];
      const nextBrands = current.brands.filter((_, itemIndex) => itemIndex !== index);
      const removedBrandId = brand?.id;
      const nextPhoneTypes = current.phone_types.filter((item) => item.brand_id !== removedBrandId);
      const validTypeIds = new Set(nextPhoneTypes.map((item) => item.id));
      return {
        ...current,
        brands: nextBrands,
        phone_types: nextPhoneTypes,
        devices: current.devices.filter(
          (item) => item.brand_id !== removedBrandId && validTypeIds.has(item.phone_type_id)
        ),
      };
    });
  }

  function addPhoneType() {
    const defaultBrand = draft.brands[0]?.id || '';
    setDraft((current) => ({
      ...current,
      phone_types: [...current.phone_types, { ...createPhoneType(), brand_id: defaultBrand }],
    }));
  }

  function removePhoneType(index) {
    setDraft((current) => {
      const phoneType = current.phone_types[index];
      const removedTypeId = phoneType?.id;
      return {
        ...current,
        phone_types: current.phone_types.filter((_, itemIndex) => itemIndex !== index),
        devices: current.devices.filter((item) => item.phone_type_id !== removedTypeId),
      };
    });
  }

  function addCondition() {
    const newCondition = createCondition();
    setDraft((current) => ({
      ...current,
      conditions: [...current.conditions, newCondition],
      devices: current.devices.map((device) => ({
        ...device,
        condition_prices: {
          ...device.condition_prices,
          [newCondition.id || `condition-${current.conditions.length + 1}`]: 0,
        },
      })),
    }));
  }

  function removeCondition(index) {
    setDraft((current) => {
      const condition = current.conditions[index];
      const removedConditionId = condition?.id;
      return {
        ...current,
        conditions: current.conditions.filter((_, itemIndex) => itemIndex !== index),
        devices: current.devices.map((device) => {
          const nextPrices = { ...device.condition_prices };
          delete nextPrices[removedConditionId];
          return { ...device, condition_prices: nextPrices };
        }),
      };
    });
  }

  function addDevice() {
    const defaultBrand = draft.brands[0]?.id || '';
    const defaultType = draft.phone_types.find((item) => item.brand_id === defaultBrand)?.id || draft.phone_types[0]?.id || '';
    const conditionPrices = Object.fromEntries(draft.conditions.map((item) => [item.id, 0]));
    setDraft((current) => ({
      ...current,
      devices: [
        ...current.devices,
        { ...createDevice(), brand_id: defaultBrand, phone_type_id: defaultType, condition_prices: conditionPrices },
      ],
    }));
  }

  function removeDevice(index) {
    setDraft((current) => ({
      ...current,
      devices: current.devices.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function saveCatalog() {
    setError('');
    setAdminMessage('');
    try {
      const normalizedDraft = normalizeDraftRelations(draft);
      const brandIdMap = new Map(
        normalizedDraft.brands.map((item, index) => [item.id, slugify(item.name || `brand-${index + 1}`)])
      );
      const phoneTypeIdMap = new Map(
        normalizedDraft.phone_types.map((item, index) => [item.id, slugify(item.name || `type-${index + 1}`)])
      );
      const conditionIdMap = new Map(
        normalizedDraft.conditions.map((item, index) => [item.id, slugify(item.name || `condition-${index + 1}`)])
      );

      const payload = {
        brands: normalizedDraft.brands.map((item, index) => ({
          id: brandIdMap.get(item.id) || slugify(item.name || `brand-${index + 1}`),
          name: item.name || `Hãng ${index + 1}`,
        })),
        phone_types: normalizedDraft.phone_types.map((item, index) => ({
          id: phoneTypeIdMap.get(item.id) || slugify(item.name || `type-${index + 1}`),
          brand_id: brandIdMap.get(item.brand_id) || brandIdMap.get(normalizedDraft.brands[0]?.id) || '',
          name: item.name || `Loại ${index + 1}`,
        })),
        conditions: normalizedDraft.conditions.map((item, index) => ({
          id: conditionIdMap.get(item.id) || slugify(item.name || `condition-${index + 1}`),
          name: item.name || `Tình trạng ${index + 1}`,
          description: item.description || '',
          health_percent: toFiniteNumber(item.health_percent, 0),
        })),
        devices: normalizedDraft.devices.map((item, index) => {
          const resolvedPhoneType = normalizedDraft.phone_types.find((type) => type.id === item.phone_type_id);
          return {
            id: item.id || index + 1,
            brand_id: brandIdMap.get(resolvedPhoneType?.brand_id) || brandIdMap.get(normalizedDraft.brands[0]?.id) || '',
            phone_type_id: phoneTypeIdMap.get(item.phone_type_id) || phoneTypeIdMap.get(normalizedDraft.phone_types[0]?.id) || '',
            model: item.model || slugify(`model-${index + 1}`),
            display_name: item.model || slugify(`model-${index + 1}`),
            storage_options: Object.fromEntries(
              Object.entries(item.storage_options || {}).map(([key, value]) => [key, toInteger(value, 0)])
            ),
            base_price: toInteger(item.base_price, 0),
            floor_price: toInteger(item.floor_price, 0),
            ceiling_price: toInteger(item.ceiling_price, 0),
            condition_prices: Object.fromEntries(
              Object.entries(item.condition_prices || {}).map(([key, value]) => [
                conditionIdMap.get(key) || key,
                toInteger(value, 0),
              ])
            ),
          };
        }),
        deduction_settings: {
          visual: Object.fromEntries(
            Object.entries(normalizedDraft.deduction_settings?.visual || {}).map(([key, value]) => [
              key,
              toFiniteNumber(value, 0),
            ])
          ),
          functional: Object.fromEntries(
            Object.entries(normalizedDraft.deduction_settings?.functional || {}).map(([key, value]) => [
              key,
              toFiniteNumber(value, 0),
            ])
          ),
          battery: {
            threshold: toInteger(normalizedDraft.deduction_settings?.battery?.threshold, 85),
            percent_per_point: toFiniteNumber(normalizedDraft.deduction_settings?.battery?.percent_per_point, 0),
          },
        },
      };

      if (!payload.brands.length || !payload.phone_types.length || !payload.conditions.length) {
        throw new Error('Cần có ít nhất một hãng, một dòng máy và một mức tình trạng.');
      }

      const invalidDevice = payload.devices.find((item) => !item.brand_id || !item.phone_type_id || !item.model);
      if (invalidDevice) {
        throw new Error('Mỗi thiết bị cần có hãng, dòng máy và mã model trước khi lưu.');
      }

      const response = await tradeInAPI.savePricing(payload);
      const savedPayload = response?.data || payload;
      setAdminMessage('Đã cập nhật danh mục và bảng giá thu cũ đổi mới thành công.');
      setCatalog(savedPayload);
      setDraft(savedPayload);
      setDefaultSelections(savedPayload);
    } catch (err) {
      setError(getTradeInErrorMessage(err));
    }
  }

  const headerTitle = isAdminView
    ? 'Quản lý thu cũ đổi mới'
    : 'Thu cũ đổi mới với nhận diện lỗi điện thoại bằng AI';
  const headerLead = isAdminView
    ? 'Trang quản trị gồm danh mục thu cũ đổi mới và quản lý bảng giá thu cũ đổi mới.'
    : 'Khách hàng có thể đánh giá nhanh tình trạng máy bằng ảnh, video và các lỗi chức năng cơ bản.';

  if (!isAdminView) {
    return (
      <div className={styles.page}>
        <section className={styles.hero}>
          <div>
            <h1>{headerTitle}</h1>
            <p className={styles.lead}>{headerLead}</p>
          </div>
        </section>

        {error && <div className={styles.alertError}>{error}</div>}
        {adminMessage && <div className={styles.alertSuccess}>{adminMessage}</div>}
        {appointmentMessage && <div className={styles.alertSuccess}>{appointmentMessage}</div>}

        <div className={styles.layout}>
          <form className={styles.card} onSubmit={submitAnalysis}>
            <h2>Khảo sát máy</h2>
            <div className={styles.grid}>
              <label>
                Hãng điện thoại
                <select value={form.brand_id} onChange={(event) => updateForm('brand_id', event.target.value)}>
                  {catalog.brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Loại điện thoại
                <select value={form.phone_type_id} onChange={(event) => updateForm('phone_type_id', event.target.value)}>
                  {filteredPhoneTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Dòng máy
                <select value={form.model_name} onChange={(event) => updateForm('model_name', event.target.value)}>
                  {filteredDevices.map((device) => (
                    <option key={device.model} value={device.model}>{device.display_name || device.model}</option>
                  ))}
                </select>
              </label>

              <label>
                Bộ nhớ
                <select value={form.storage} onChange={(event) => updateForm('storage', event.target.value)}>
                  {Object.keys(selectedDevice?.storage_options || {}).map((storage) => (
                    <option key={storage} value={storage}>{storage}</option>
                  ))}
                </select>
              </label>

              <label>
                % pin
                <input type="number" min="50" max="100" value={form.battery_health} onChange={(event) => updateForm('battery_health', Number(event.target.value))} />
              </label>

              <label>
                Ảnh mặt trước
                <input type="file" accept="image/*" onChange={(event) => updateForm('front_image', event.target.files?.[0] || null)} />
              </label>

              <label>
                Ảnh mặt sau
                <input type="file" accept="image/*" onChange={(event) => updateForm('back_image', event.target.files?.[0] || null)} />
              </label>

              <label>
                Video quay máy
                <input type="file" accept="video/*" onChange={(event) => updateForm('video', event.target.files?.[0] || null)} />
              </label>
            </div>

            <div className={styles.issueGrid}>
              {issueFields.map((field) => (
                <label key={field.key} className={styles.toggle}>
                  <input type="checkbox" checked={form[field.key]} onChange={(event) => updateForm(field.key, event.target.checked)} />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>

            <div className={styles.actions}>
              <button type="submit" disabled={loading}>
                {loading ? 'Đang phân tích ảnh...' : 'Phân tích và báo giá'}
              </button>
              <button type="button" className={styles.secondaryButton} onClick={submitVideo} disabled={videoLoading}>
                {videoLoading ? 'Đang phân tích video...' : 'Phân tích video'}
              </button>
            </div>
          </form>

          <div className={styles.resultColumn}>
            <div className={styles.card}>
              <h2>Kết quả AI</h2>
              {!analysis ? (
                <p className={styles.muted}>Kết quả định giá sẽ xuất hiện tại đây sau khi bạn tải đủ ảnh.</p>
              ) : (
                <>
                  <div className={styles.quoteBox}>
                    <span>Giá đề xuất</span>
                    <strong>{formatCurrency(analysis.quote.offer_range.suggested)}</strong>
                    <small>
                      Khoảng hợp lý: {formatCurrency(analysis.quote.offer_range.min)} - {formatCurrency(analysis.quote.offer_range.max)}
                    </small>
                  </div>
                  <div className={styles.stats}>
                    <div>
                      <span>Tình trạng</span>
                      <strong>{analysis.quote.condition?.name || 'Không rõ'}</strong>
                    </div>
                    <div>
                      <span>Điểm sức khỏe máy</span>
                      <strong>{Math.round(analysis.quote.health_score * 100)}%</strong>
                    </div>
                    <div>
                      <span>Loại máy</span>
                      <strong>{analysis.quote.phone_type}</strong>
                    </div>
                  </div>
                  {analysis.quote.condition?.description && (
                    <p className={styles.muted}>{analysis.quote.condition.description}</p>
                  )}
                  {analysis.quote.condition?.health_percent !== undefined && (
                    <p className={styles.muted}>Ngưỡng sức khỏe của mức này: từ {analysis.quote.condition.health_percent}%.</p>
                  )}

                  <div className={styles.subSection}>
                    <h3>Giải thích cách tính giá</h3>
                    <div className={styles.stats}>
                      <div>
                        <span>Giá trần</span>
                        <strong>{formatCurrency(analysis.quote.pricing_method?.ceiling_price)}</strong>
                      </div>
                      <div>
                        <span>Tổng khấu trừ</span>
                        <strong>{formatCurrency(analysis.quote.deductions?.total_amount)}</strong>
                      </div>
                      <div>
                        <span>Giá sau khấu trừ</span>
                        <strong>{formatCurrency(analysis.quote.offer_range.suggested)}</strong>
                      </div>
                    </div>

                    <div className={styles.adminList}>
                      <div className={styles.adminCard}>
                        <h4>Khấu trừ ngoại hình</h4>
                        {analysis.quote.deductions?.visual_breakdown?.length ? (
                          <ul>
                            {analysis.quote.deductions.visual_breakdown.map((item) => (
                              <li key={`visual-${item.label}`}>
                                {item.label}: phát hiện {item.count} lỗi, tính tiền như {item.count_used_for_pricing} lỗi, trừ {Math.round(item.applied_percent * 10000) / 100}%,
                                tương đương {formatCurrency(item.amount)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={styles.muted}>Không có lỗi ngoại hình bị phát hiện.</p>
                        )}
                      </div>

                      <div className={styles.adminCard}>
                        <h4>Khấu trừ chức năng</h4>
                        {analysis.quote.deductions?.functional_breakdown?.length ? (
                          <ul>
                            {analysis.quote.deductions.functional_breakdown.map((item) => (
                              <li key={`functional-${item.key}`}>
                                {item.label}: trừ {Math.round(item.applied_percent * 10000) / 100}%,
                                tương đương {formatCurrency(item.amount)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className={styles.muted}>Không có lỗi chức năng được chọn.</p>
                        )}
                      </div>

                      <div className={styles.adminCard}>
                        <h4>Khấu trừ pin</h4>
                        {analysis.quote.deductions?.battery_amount ? (
                          <ul>
                            <li>
                              Pin {analysis.quote.battery_health}% thấp hơn mức chuẩn {analysis.quote.deductions.battery_breakdown?.threshold}%,
                              trừ {Math.round((analysis.quote.deductions.battery_breakdown?.applied_percent || 0) * 10000) / 100}%,
                              tương đương {formatCurrency(analysis.quote.deductions.battery_amount)}
                            </li>
                          </ul>
                        ) : (
                          <p className={styles.muted}>
                            Pin chưa bị khấu trừ vì đang từ {analysis.quote.deductions.battery_breakdown?.threshold}% trở lên.
                          </p>
                        )}
                      </div>
                    </div>

                    <p className={styles.muted}>
                      Nếu một loại lỗi ngoại hình lặp lại nhiều lần, hệ thống chỉ tính tối đa 2 lỗi cho việc khấu trừ.
                    </p>
                  </div>

                  <div className={styles.imagePanels}>
                    {analysis.image_results.map((item) => (
                      <div key={item.side} className={styles.imageCard}>
                        <h3>{item.side === 'front' ? 'Mặt trước' : 'Mặt sau'}</h3>
                        {item.annotated_image ? <img src={base64Src(item.annotated_image)} alt={item.side} /> : <p className={styles.muted}>Không có ảnh đánh dấu.</p>}
                        <ul>
                          {item.detections.length ? item.detections.map((detection, index) => (
                            <li key={`${detection.label}-${index}`}>{detection.label} ({Math.round(detection.confidence * 100)}%)</li>
                          )) : <li>Không phát hiện lỗi ngoại hình.</li>}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className={styles.card} style={{ marginTop: 20 }}>
                    <h2>Đặt lịch thu cũ đổi mới</h2>
                    {!userInfo ? (
                      <p className={styles.muted}>Đăng nhập để gửi lịch hẹn sau khi đã có báo giá AI.</p>
                    ) : (
                      <form className={styles.grid} onSubmit={submitTradeInAppointment}>
                        <label>
                          Họ và tên
                          <input
                            value={appointmentForm.customerName}
                            onChange={(event) => updateAppointmentForm('customerName', event.target.value)}
                            required
                          />
                        </label>

                        <label>
                          Số điện thoại
                          <input
                            value={appointmentForm.phone}
                            onChange={(event) => updateAppointmentForm('phone', event.target.value)}
                            required
                          />
                        </label>

                        <label>
                          Ngày hẹn
                          <input
                            type="date"
                            value={appointmentForm.appointmentDate}
                            onChange={(event) => updateAppointmentForm('appointmentDate', event.target.value)}
                            required
                          />
                        </label>

                        <label>
                          Giờ hẹn
                          <input
                            type="time"
                            value={appointmentForm.appointmentTime}
                            onChange={(event) => updateAppointmentForm('appointmentTime', event.target.value)}
                            required
                          />
                        </label>

                        <label className={styles.fullWidth}>
                          Ghi chú thêm
                          <textarea
                            rows={3}
                            value={appointmentForm.note}
                            onChange={(event) => updateAppointmentForm('note', event.target.value)}
                            placeholder="Ví dụ: Tôi mang máy đến cửa hàng lúc 15:00, cần kiểm tra kỹ màn hình và pin."
                          />
                        </label>

                        <div className={`${styles.fullWidth} ${styles.appointmentSubmitBlock}`}>
                          <p className={styles.muted}>
                            Lịch hẹn sẽ gửi kèm tên khách, kiểu máy, tình trạng, sức khỏe máy, % pin, khoảng giá, ảnh AI đã phân tích và video nếu bạn có tải lên.
                          </p>
                          <button type="submit" className={styles.appointmentSubmitButton} disabled={appointmentLoading}>
                            {appointmentLoading ? 'Đang gửi lịch hẹn...' : 'Gửi lịch hẹn thu cũ đổi mới'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className={styles.card}>
              <h2>Phân tích video</h2>
              {!videoAnalysis ? (
                <p className={styles.muted}>Hệ thống sẽ cắt các ảnh có lỗi từ video để hỗ trợ kiểm tra nhanh tình trạng máy.</p>
              ) : (
                <>
                  <div className={styles.stats}>
                    <div><span>Khung hình đã quét</span><strong>{videoAnalysis.frames_analyzed}</strong></div>
                    <div><span>Số loại lỗi</span><strong>{Object.keys(videoAnalysis.counts || {}).length}</strong></div>
                    <div><span>Tổng lỗi bắt được</span><strong>{(videoAnalysis.findings || []).length}</strong></div>
                  </div>
                  <div className={styles.cropGrid}>
                    {(videoAnalysis.crops || []).map((crop, index) => (
                      <figure key={`${crop.label}-${index}`} className={styles.cropCard}>
                        <img src={base64Src(crop.image)} alt={crop.label} />
                        <figcaption>{crop.label} - frame {crop.frame_index}</figcaption>
                      </figure>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <h1>{headerTitle}</h1>
          <p className={styles.lead}>{headerLead}</p>
        </div>
      </section>

      {error && <div className={styles.alertError}>{error}</div>}
      {adminMessage && <div className={styles.alertSuccess}>{adminMessage}</div>}

      <div className={styles.adminSection}>
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Danh mục thu cũ đổi mới</h2>
              <p className={styles.muted}>Admin quản lý hãng, loại điện thoại và các mức tình trạng kèm mô tả chi tiết.</p>
            </div>
            <button type="button" onClick={saveCatalog}>Lưu tất cả</button>
          </div>

          <div className={styles.adminGrid}>
            <section className={styles.adminBlock}>
              <div className={styles.blockHeader}>
                <h3>Hãng điện thoại</h3>
                <button type="button" className={styles.secondaryButton} onClick={addBrand}>Thêm hãng</button>
              </div>
              {draft.brands.map((brand, index) => (
                <div key={`brand-${index}`} className={styles.inlineRow}>
                  <input value={brand.name} placeholder="Tên hãng" onChange={(event) => updateDraftSection('brands', index, 'name', event.target.value)} />
                  <button type="button" className={styles.dangerButton} onClick={() => removeBrand(index)}>Xóa</button>
                </div>
              ))}
            </section>

            <section className={styles.adminBlock}>
              <div className={styles.blockHeader}>
                <h3>Loại điện thoại</h3>
                <button type="button" className={styles.secondaryButton} onClick={addPhoneType}>Thêm loại</button>
              </div>
              {draft.phone_types.map((type, index) => (
                <div key={`type-${index}`} className={styles.stackRow}>
                  <div className={styles.inlineRow}>
                    <input value={type.name} placeholder="Tên loại" onChange={(event) => updateDraftSection('phone_types', index, 'name', event.target.value)} />
                    <button type="button" className={styles.dangerButton} onClick={() => removePhoneType(index)}>Xóa</button>
                  </div>
                  <select value={type.brand_id} onChange={(event) => updateDraftSection('phone_types', index, 'brand_id', event.target.value)}>
                    {draft.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name || brand.id}</option>)}
                  </select>
                </div>
              ))}
            </section>

            <section className={styles.adminBlock}>
              <div className={styles.blockHeader}>
                <h3>Tình trạng điện thoại</h3>
                <button type="button" className={styles.secondaryButton} onClick={addCondition}>Thêm tình trạng</button>
              </div>
              {draft.conditions.map((condition, index) => (
                <div key={`condition-${index}`} className={styles.conditionCard}>
                  <div className={styles.inlineRow}>
                  <input value={condition.name} placeholder="Tên tình trạng" onChange={(event) => updateDraftSection('conditions', index, 'name', event.target.value)} />
                    <button type="button" className={styles.dangerButton} onClick={() => removeCondition(index)}>Xóa</button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={condition.health_percent ?? 0}
                    placeholder="% sức khỏe tối thiểu"
                    onChange={(event) => updateDraftSection('conditions', index, 'health_percent', Number(event.target.value))}
                  />
                  <textarea
                    value={condition.description}
                    placeholder="Mô tả chi tiết tình trạng"
                    onChange={(event) => updateDraftSection('conditions', index, 'description', event.target.value)}
                  />
                </div>
              ))}
            </section>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Thiết lập khấu trừ</h2>
              <p className={styles.muted}>Admin có thể chỉnh phần trăm khấu trừ theo lỗi ngoại hình, lỗi chức năng và pin ngay trên giao diện.</p>
            </div>
          </div>

          <div className={styles.cardNote}>
            <strong>Quản lý khấu trừ ngoại hình và chức năng</strong>
            <span>Mỗi dòng là một loại lỗi. Admin nhập số thập phân, ví dụ `0.12` nghĩa là trừ 12% giá trần.</span>
          </div>

          <div className={styles.settingsGrid}>
            <section className={styles.adminBlock}>
              <div className={styles.blockHeader}>
                <h3>Khấu trừ ngoại hình</h3>
              </div>
              <p className={styles.muted}>Thiết lập phần trăm trừ theo từng loại lỗi ngoại hình AI nhận diện được.</p>
              <div className={styles.settingsFields}>
                {Object.entries(visualLabels).map(([key, label]) => (
                  <label key={`visual-setting-${key}`}>
                    {label}
                    <input
                      type="number"
                      step="0.001"
                      value={draft.deduction_settings?.visual?.[key] ?? 0}
                      onChange={(event) => updateDeductionSetting('visual', key, event.target.value)}
                    />
                  </label>
                ))}
              </div>
              <p className={styles.muted}>Nhập dạng số thập phân. Ví dụ `0.12` nghĩa là trừ 12% giá trần cho mỗi lỗi.</p>
            </section>

            <section className={styles.adminBlock}>
              <div className={styles.blockHeader}>
                <h3>Khấu trừ chức năng</h3>
              </div>
              <p className={styles.muted}>Thiết lập phần trăm trừ cho các lỗi chức năng do khách hàng chọn.</p>
              <div className={styles.settingsFields}>
                {Object.entries(functionalLabels).map(([key, label]) => (
                  <label key={`functional-setting-${key}`}>
                    {label}
                    <input
                      type="number"
                      step="0.001"
                      value={draft.deduction_settings?.functional?.[key] ?? 0}
                      onChange={(event) => updateDeductionSetting('functional', key, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </section>

            <section className={styles.adminBlock}>
              <div className={styles.blockHeader}>
                <h3>Khấu trừ pin</h3>
              </div>
              <p className={styles.muted}>Thiết lập ngưỡng pin chuẩn và mức trừ cho mỗi 1% pin thiếu.</p>
              <div className={styles.settingsFields}>
                <label>
                  Ngưỡng pin chuẩn
                  <input
                    type="number"
                    value={draft.deduction_settings?.battery?.threshold ?? 85}
                    onChange={(event) => updateBatterySetting('threshold', event.target.value)}
                  />
                </label>
                <label>
                  % trừ cho mỗi 1% pin thiếu
                  <input
                    type="number"
                    step="0.001"
                    value={draft.deduction_settings?.battery?.percent_per_point ?? 0.0035}
                    onChange={(event) => updateBatterySetting('percent_per_point', event.target.value)}
                  />
                </label>
              </div>
            </section>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <h2>Quản lý bảng giá thu cũ đổi mới</h2>
              <p className={styles.muted}>Bảng giá được rút gọn theo kiểu bảng tổng quát để chỉnh nhanh như Excel. Mỗi dòng là một model điện thoại.</p>
            </div>
            <button type="button" className={styles.secondaryButton} onClick={addDevice}>Thêm điện thoại</button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.priceTable}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Hãng</th>
                  <th>Loại</th>
                  <th>Mã model</th>
                  <th>Giá cơ sở</th>
                  <th>Giá sàn</th>
                  <th>Giá trần</th>
                  {storageColumns.map((storage) => (
                    <th key={`storage-head-${storage}`}>{storage}</th>
                  ))}
                  {draft.conditions.map((condition) => (
                    <th key={`condition-head-${condition.id}`}>{condition.name || condition.id}</th>
                  ))}
                  <th>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {draft.devices.map((device, index) => (
                  <tr key={`${device.id || device.model || 'device'}-${index}`}>
                    <td>
                      <input className={styles.tableInputSmall} value={device.id ?? index + 1} readOnly />
                    </td>
                    <td>
                      <select
                        className={styles.tableSelect}
                        value={device.brand_id}
                        onChange={(event) => updateDraftSection('devices', index, 'brand_id', event.target.value)}
                      >
                        {draft.brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name || brand.id}</option>)}
                      </select>
                    </td>
                    <td>
                      <select
                        className={styles.tableSelect}
                        value={device.phone_type_id}
                        onChange={(event) => updateDraftSection('devices', index, 'phone_type_id', event.target.value)}
                      >
                        {draft.phone_types.filter((type) => type.brand_id === device.brand_id).map((type) => (
                          <option key={type.id} value={type.id}>{type.name || type.id}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className={styles.tableInputModel}
                        value={device.model}
                        onChange={(event) => updateDraftSection('devices', index, 'model', event.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.tableInput}
                        type="text"
                        value={formatNumberDisplay(device.base_price)}
                        onChange={(event) => updateDraftSection('devices', index, 'base_price', parseNumberInput(event.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.tableInput}
                        type="text"
                        value={formatNumberDisplay(device.floor_price)}
                        onChange={(event) => updateDraftSection('devices', index, 'floor_price', parseNumberInput(event.target.value))}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.tableInput}
                        type="text"
                        value={formatNumberDisplay(device.ceiling_price)}
                        onChange={(event) => updateDraftSection('devices', index, 'ceiling_price', parseNumberInput(event.target.value))}
                      />
                    </td>
                    {storageColumns.map((storage) => (
                      <td key={`${device.model}-${storage}`}>
                        <input
                          className={styles.tableInput}
                          type="text"
                          value={formatNumberDisplay(device.storage_options?.[storage] ?? 0)}
                          onChange={(event) => updateDeviceStorage(index, storage, event.target.value)}
                        />
                      </td>
                    ))}
                    {draft.conditions.map((condition) => (
                      <td key={`${device.model}-${condition.id}`}>
                        <input
                          className={styles.tableInput}
                          type="text"
                          value={formatNumberDisplay(device.condition_prices?.[condition.id] ?? 0)}
                          onChange={(event) => updateDeviceConditionPrice(index, condition.id, event.target.value)}
                        />
                      </td>
                    ))}
                    <td>
                      <button type="button" className={styles.dangerButton} onClick={() => removeDevice(index)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
