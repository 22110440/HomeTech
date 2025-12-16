import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './RevenueStatistics.module.css';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export default function RevenueStatistics() {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [topProducts, setTopProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);

    // Filter states
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [groupBy, setGroupBy] = useState('DAY');
    const [categoryId, setCategoryId] = useState('');
    const [productId, setProductId] = useState('');

    useEffect(() => {
        fetchCategories();
        fetchProducts();
        fetchData();
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            fetchData();
        }
    }, [startDate, endDate, groupBy, categoryId, productId]);

    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/categories');
            const data = await response.json();
            if (data.success) {
                setCategories(data.data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products');
            const data = await response.json();
            if (data.success) {
                setProducts(data.data);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            console.log('🔑 Token:', token ? 'Present' : 'Missing');

            const headers = {
                'Authorization': `Bearer ${token}`
            };

            // Build query params
            const params = new URLSearchParams({
                startDate,
                endDate,
                groupBy
            });
            if (categoryId) params.append('categoryId', categoryId);
            if (productId) params.append('productId', productId);

            console.log('📊 Fetching revenue stats with params:', params.toString());

            // Fetch revenue stats
            const statsResponse = await fetch(`/api/revenue/stats?${params}`, { headers });
            console.log('📈 Stats response status:', statsResponse.status);

            const statsData = await statsResponse.json();
            console.log('📈 Stats data:', statsData);

            if (statsData.success) {
                setStats(statsData.data);
                console.log('✅ Stats loaded successfully');
            } else {
                console.error('❌ Stats error:', statsData.message);
                alert('Không thể tải thống kê: ' + statsData.message);
            }

            // Fetch top products
            const topParams = new URLSearchParams({ startDate, endDate });
            if (categoryId) topParams.append('categoryId', categoryId);

            console.log('🏆 Fetching top products with params:', topParams.toString());

            const topResponse = await fetch(`/api/revenue/top-products?${topParams}`, { headers });
            console.log('🏆 Top products response status:', topResponse.status);

            const topData = await topResponse.json();
            console.log('🏆 Top products data:', topData);

            if (topData.success) {
                setTopProducts(topData.data);
                console.log('✅ Top products loaded successfully');
            } else {
                console.error('❌ Top products error:', topData.message);
            }

        } catch (error) {
            console.error('💥 Error fetching data:', error);
            alert('Có lỗi xảy ra: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const removeVietnameseTones = (str) => {
        if (!str) return '';
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
        str = str.replace(/đ/g, 'd');
        str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
        str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
        str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
        str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
        str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
        str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
        str = str.replace(/Đ/g, 'D');
        return str;
    };

    const formatCurrencyForPDF = (value) => {
        const formatted = new Intl.NumberFormat('vi-VN').format(value);
        return `${formatted} d`;
    };

    const exportToPDF = () => {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text('Bao cao Doanh thu', 14, 22);

        // Date range
        doc.setFontSize(11);
        doc.text(`Tu ngay: ${startDate} den ${endDate}`, 14, 32);
        doc.text(`Nhom theo: ${groupBy}`, 14, 38);

        // Summary stats
        doc.setFontSize(12);
        doc.text('Tong quan:', 14, 48);
        doc.setFontSize(10);
        doc.text(`Tong doanh thu: ${formatCurrencyForPDF(stats?.totalRevenue || 0)}`, 20, 54);
        doc.text(`So don hang: ${stats?.orderCount || 0}`, 20, 60);
        doc.text(`Gia tri TB/don: ${formatCurrencyForPDF(stats?.averageOrderValue || 0)}`, 20, 66);

        // Grouped data table
        if (stats?.groupedData && stats.groupedData.length > 0) {
            doc.text('Doanh thu theo thoi gian:', 14, 76);
            autoTable(doc, {
                startY: 80,
                head: [['Thoi gian', 'Doanh thu']],
                body: stats.groupedData.map(item => [
                    item.period,
                    formatCurrencyForPDF(item.revenue)
                ]),
                styles: { font: 'helvetica', fontSize: 10 },
                headStyles: { fillColor: [102, 126, 234] }
            });
        }

        // Top products table
        if (topProducts.length > 0) {
            const finalY = doc.lastAutoTable?.finalY || 90;
            doc.text('Top 5 san pham:', 14, finalY + 10);
            autoTable(doc, {
                startY: finalY + 14,
                head: [['San pham', 'Danh muc', 'Doanh thu', 'So luong']],
                body: topProducts.map(item => [
                    removeVietnameseTones(item.productName),
                    removeVietnameseTones(item.categoryName),
                    formatCurrencyForPDF(item.revenue),
                    item.quantitySold
                ]),
                styles: { font: 'helvetica', fontSize: 10 },
                headStyles: { fillColor: [102, 126, 234] }
            });
        }

        // Save PDF
        doc.save(`doanh-thu-${startDate}-${endDate}.pdf`);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(value);
    };

    // Prepare chart data
    const chartData = {
        labels: stats?.groupedData?.map(item => item.period) || [],
        datasets: [
            {
                label: 'Doanh thu',
                data: stats?.groupedData?.map(item => item.revenue) || [],
                borderColor: 'rgb(102, 126, 234)',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Biểu đồ Doanh thu theo Thời gian'
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return 'Doanh thu: ' + formatCurrency(context.parsed.y);
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value) {
                        return new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
                    }
                }
            }
        }
    };

    if (loading && !stats) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.spinner}></div>
                <p>Đang tải dữ liệu...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Thống kê Doanh thu</h1>
                <button className={styles.exportButton} onClick={exportToPDF}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Xuất PDF
                </button>
            </div>

            {/* Filters */}
            <div className={styles.filtersContainer}>
                <div className={styles.filterGroup}>
                    <label>Từ ngày:</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={styles.dateInput}
                    />
                </div>

                <div className={styles.filterGroup}>
                    <label>Đến ngày:</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className={styles.dateInput}
                    />
                </div>

                <div className={styles.filterGroup}>
                    <label>Nhóm theo:</label>
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                        className={styles.select}
                    >
                        <option value="DAY">Ngày</option>
                        <option value="WEEK">Tuần</option>
                        <option value="MONTH">Tháng</option>
                        <option value="QUARTER">Quý</option>
                        <option value="YEAR">Năm</option>
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label>Danh mục:</label>
                    <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className={styles.select}
                    >
                        <option value="">Tất cả</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label>Sản phẩm:</label>
                    <select
                        value={productId}
                        onChange={(e) => setProductId(e.target.value)}
                        className={styles.select}
                    >
                        <option value="">Tất cả</option>
                        {products.map(prod => (
                            <option key={prod.id} value={prod.id}>{prod.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Summary Cards */}
            <div className={styles.summaryCards}>
                <div className={styles.card}>
                    <div className={styles.cardIcon} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className={styles.cardContent}>
                        <p className={styles.cardLabel}>Tổng doanh thu</p>
                        <p className={styles.cardValue}>{formatCurrency(stats?.totalRevenue || 0)}</p>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardIcon} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                    </div>
                    <div className={styles.cardContent}>
                        <p className={styles.cardLabel}>Số đơn hàng</p>
                        <p className={styles.cardValue}>{stats?.orderCount || 0}</p>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardIcon} style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div className={styles.cardContent}>
                        <p className={styles.cardLabel}>Giá trị TB/đơn</p>
                        <p className={styles.cardValue}>{formatCurrency(stats?.averageOrderValue || 0)}</p>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className={styles.chartContainer}>
                <div className={styles.chartWrapper}>
                    <Line data={chartData} options={chartOptions} />
                </div>
            </div>

            {/* Top Products */}
            <div className={styles.topProductsSection}>
                <h2 className={styles.sectionTitle}>Top 5 Sản phẩm Doanh thu Cao</h2>
                {topProducts.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>Không có dữ liệu</p>
                    </div>
                ) : (
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Sản phẩm</th>
                                    <th>Danh mục</th>
                                    <th>Doanh thu</th>
                                    <th>Số lượng bán</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topProducts.map((product, index) => (
                                    <tr key={product.productId}>
                                        <td>
                                            <span className={styles.rank}>{index + 1}</span>
                                        </td>
                                        <td className={styles.productName}>{product.productName}</td>
                                        <td>{product.categoryName}</td>
                                        <td className={styles.revenue}>{formatCurrency(product.revenue)}</td>
                                        <td>{product.quantitySold}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
