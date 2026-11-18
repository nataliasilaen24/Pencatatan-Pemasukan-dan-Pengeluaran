"use strict";

const STORAGE_KEY = "keuanganKuTransaksi";
const CATEGORY_STORAGE_KEY = "keuanganKuKategori";
const API_BASE = "../backend/api";
const DEFAULT_CATEGORIES = {
    pemasukan: ["Gaji", "Uang saku", "Bonus", "Pendapatan lainnya"],
    pengeluaran: [
        "Makanan",
        "Transportasi",
        "Pendidikan",
        "Belanja",
        "Kesehatan",
        "Tagihan",
        "Pengeluaran lainnya"
    ]
};
const MODULES = {
    profile: {
        eyebrow: "AKUN",
        title: "Profil Saya",
        description: "Informasi akun KeuanganKu.",
        status: "Sistem akun belum tersedia",
        message: "Aplikasi saat ini belum menggunakan login atau profil pengguna. Data transaksi hanya tersimpan di browser/perangkat ini.",
        details: ["Jangan gunakan penyimpanan lokal ini untuk data keuangan sensitif."],
        icon: "#icon-user"
    }
};

const form = document.getElementById("formTransaksi");
const quickForm = document.getElementById("quickForm");
const formPanel = document.getElementById("transactionFormPanel");
const transactionBody = document.getElementById("daftarTransaksi");
const recentBody = document.getElementById("transaksiTerbaru");
const feedback = document.getElementById("transactionFeedback");
const globalFeedback = document.getElementById("globalFeedback");
const categoryInput = document.getElementById("kategori");
const typeInput = document.getElementById("jenis");
const dateInput = document.getElementById("tanggal");
const quickCategoryInput = document.getElementById("quickKategori");
const quickTypeInput = document.getElementById("quickJenis");
const quickDateInput = document.getElementById("quickTanggal");
const chartMonthFilter = document.getElementById("chartMonthFilter");
let categories = loadCategories();
let transaksi = loadTransactions();
let chart = null;
let reportChart = null;
let reportTransactions = [];
let categoryIds = { pemasukan: {}, pengeluaran: {} };
let isAuthenticated = false;

function localDateValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isValidTransaction(item) {
    return item &&
        typeof item.id === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.tanggal) &&
        typeof item.keterangan === "string" &&
        typeof item.kategori === "string" &&
        (item.jenis === "pemasukan" || item.jenis === "pengeluaran") &&
        Number.isFinite(item.jumlah) &&
        item.jumlah > 0;
}

function loadTransactions() {
    return [];
}

function copyCategories(source) {
    return {
        pemasukan: [...source.pemasukan],
        pengeluaran: [...source.pengeluaran]
    };
}

function loadCategories() {
    return copyCategories(DEFAULT_CATEGORIES);
}

function saveTransactions() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transaksi));
        return true;
    } catch (error) {
        showGlobalFeedback(
            `Perubahan belum tersimpan di perangkat ini: ${error.message}`,
            "error"
        );
        return false;
    }
}

function persistCategoryState(nextCategories, nextTransactions) {
    let previousCategories;
    let previousTransactions;
    try {
        previousCategories = localStorage.getItem(CATEGORY_STORAGE_KEY);
        previousTransactions = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
        showGlobalFeedback(`Perubahan kategori belum tersimpan: ${error.message}`, "error");
        return false;
    }

    try {
        localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(nextCategories));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTransactions));
        categories = nextCategories;
        transaksi = nextTransactions;
        return true;
    } catch (error) {
        try {
            if (previousCategories === null) {
                localStorage.removeItem(CATEGORY_STORAGE_KEY);
            } else {
                localStorage.setItem(CATEGORY_STORAGE_KEY, previousCategories);
            }
            if (previousTransactions === null) {
                localStorage.removeItem(STORAGE_KEY);
            } else {
                localStorage.setItem(STORAGE_KEY, previousTransactions);
            }
        } catch (restoreError) {
            showGlobalFeedback(
                `Perubahan kategori gagal disimpan (${error.message}) dan pemulihan data juga gagal (${restoreError.message}).`,
                "error"
            );
            return false;
        }
        showGlobalFeedback(`Perubahan kategori belum tersimpan: ${error.message}`, "error");
        return false;
    }
}

function showGlobalFeedback(message, kind) {
    globalFeedback.textContent = message;
    globalFeedback.className = `feedback${kind ? ` is-${kind}` : ""}`;
    globalFeedback.hidden = false;
}

function showCategoryFeedback(message, kind) {
    const categoryFeedback = document.getElementById("categoryFeedback");
    categoryFeedback.textContent = message;
    categoryFeedback.className = `feedback${kind ? ` is-${kind}` : ""}`;
    categoryFeedback.hidden = false;
}

function showFeedback(message, kind) {
    feedback.textContent = message;
    feedback.className = `feedback${kind ? ` is-${kind}` : ""}`;
    feedback.hidden = false;
}

function hideFeedback() {
    feedback.hidden = true;
    feedback.textContent = "";
    feedback.className = "feedback";
}

async function apiFetch(path, options = {}) {
    let response;
    try {
        response = await fetch(`${API_BASE}${path}`, {
            ...options,
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error(
                "API tidak dapat dihubungi. Jalankan Apache di XAMPP dan pastikan PostgreSQL aktif, lalu buka aplikasi melalui http://localhost."
            );
        }
        throw error;
    }
    let payload = {};
    try {
        payload = await response.json();
    } catch (error) {
        if (!response.ok) {
            throw new Error("Server tidak dapat dijangkau.");
        }
    }
    if (!response.ok) {
        throw new Error(payload.error || "Permintaan gagal.");
    }
    return payload;
}

async function loadBackendState() {
    const categoryData = await apiFetch("/categories.php");
    categoryIds = { pemasukan: {}, pengeluaran: {} };
    categories = { pemasukan: [], pengeluaran: [] };
    ["pemasukan", "pengeluaran"].forEach(type => {
        categoryData[type].forEach(category => {
            categories[type].push(category.name);
            categoryIds[type][category.name] = category.id;
        });
    });

    const transactionData = await apiFetch("/transactions.php");
    transaksi = transactionData.transactions.map(item => ({
        id: item.id,
        tanggal: item.transaction_date,
        keterangan: item.name,
        kategori: item.category,
        jenis: item.type,
        jumlah: Number(item.amount),
        catatan: item.note || "",
        createdAt: item.created_at ? Date.parse(item.created_at.replace(" ", "T")) : Date.now()
    }));
}

function formatRupiah(amount) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(amount);
}

function formatTanggal(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    }).format(new Date(year, month - 1, day));
}

function getMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthTotals(monthKey) {
    return transaksi.reduce((totals, item) => {
        if (item.tanggal.slice(0, 7) === monthKey) {
            totals[item.jenis === "pemasukan" ? "income" : "expense"] += item.jumlah;
        }
        return totals;
    }, { income: 0, expense: 0 });
}

function sortedTransactions(items) {
    return [...items].sort((a, b) =>
        b.tanggal.localeCompare(a.tanggal) ||
        (b.createdAt || 0) - (a.createdAt || 0)
    );
}

function addCell(row, value, className) {
    const cell = document.createElement("td");
    cell.textContent = value;
    if (className) {
        cell.className = className;
    }
    row.appendChild(cell);
    return cell;
}

function addEmptyState(body, message, columnCount) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = columnCount;
    cell.className = "empty-state";
    cell.textContent = message;
    row.appendChild(cell);
    body.appendChild(row);
}

function createTransactionRow(item, includeActions) {
    const row = document.createElement("tr");
    addCell(row, formatTanggal(item.tanggal));
    addCell(row, item.keterangan);
    const categoryCell = document.createElement("td");
    const categoryBadge = document.createElement("span");
    categoryBadge.className = "category-label";
    categoryBadge.textContent = item.kategori;
    categoryCell.appendChild(categoryBadge);
    row.appendChild(categoryCell);

    const typeCell = document.createElement("td");
    const typeBadge = document.createElement("span");
    typeBadge.className = `transaction-type ${item.jenis}`;
    typeBadge.textContent = item.jenis;
    typeCell.appendChild(typeBadge);
    row.appendChild(typeCell);

    addCell(
        row,
        formatRupiah(item.jumlah),
        `amount-cell ${item.jenis === "pemasukan" ? "amount-income" : "amount-expense"}`
    );

    if (includeActions) {
        const actionCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "row-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "row-action";
        editButton.dataset.action = "edit";
        editButton.dataset.id = item.id;
        editButton.textContent = "Ubah";
        editButton.setAttribute("aria-label", `Ubah transaksi ${item.keterangan}`);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "row-action delete";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.id = item.id;
        deleteButton.textContent = "Hapus";
        deleteButton.setAttribute("aria-label", `Hapus transaksi ${item.keterangan}`);

        actions.append(editButton, deleteButton);
        actionCell.appendChild(actions);
        row.appendChild(actionCell);
    }

    return row;
}

function getFilteredTransactions() {
    const query = document.getElementById("searchTransaksi").value.trim().toLocaleLowerCase("id-ID");
    const type = document.getElementById("filterJenis").value;
    const startDate = document.getElementById("filterMulai").value;
    const endDate = document.getElementById("filterSampai").value;

    if (startDate && endDate && startDate > endDate) {
        return null;
    }

    return sortedTransactions(transaksi).filter(item =>
        item.keterangan.toLocaleLowerCase("id-ID").includes(query) &&
        (!type || item.jenis === type) &&
        (!startDate || item.tanggal >= startDate) &&
        (!endDate || item.tanggal <= endDate)
    );
}

function renderTransactionTables() {
    const allSorted = sortedTransactions(transaksi);
    const filtered = getFilteredTransactions();

    transactionBody.replaceChildren();
    if (filtered === null) {
        addEmptyState(transactionBody, "Tanggal mulai tidak boleh melewati tanggal akhir.", 6);
    } else if (filtered.length === 0) {
        addEmptyState(
            transactionBody,
            transaksi.length ? "Transaksi tidak ditemukan untuk filter ini." : "Belum ada transaksi. Tambahkan transaksi pertamamu.",
            6
        );
    } else {
        filtered.forEach(item => transactionBody.appendChild(createTransactionRow(item, true)));
    }

    const search = document.getElementById("dashboardSearch").value.trim().toLocaleLowerCase("id-ID");
    const type = document.getElementById("dashboardFilterType").value;
    const category = document.getElementById("dashboardFilterCategory").value;
    const dashboardTransactions = allSorted.filter(item =>
        item.keterangan.toLocaleLowerCase("id-ID").includes(search) &&
        (!type || item.jenis === type) &&
        (!category || item.kategori === category)
    );

    recentBody.replaceChildren();
    if (dashboardTransactions.length === 0) {
        addEmptyState(
            recentBody,
            allSorted.length ? "Transaksi tidak ditemukan untuk filter ini." : "Belum ada transaksi. Catat transaksi pertamamu.",
            6
        );
    } else {
        dashboardTransactions.slice(0, 5).forEach(item =>
            recentBody.appendChild(createTransactionRow(item, true))
        );
    }
}

function setTrend(elementId, current, previous, metric) {
    const element = document.getElementById(elementId);
    const value = document.getElementById(`${elementId}Value`);
    const difference = current - previous;
    const percentage = previous === 0 ? 0 : Math.round((difference / Math.abs(previous)) * 100);
    const isPositive = metric === "expense" ? difference <= 0 : difference >= 0;

    element.classList.toggle("is-down", difference < 0);
    element.classList.toggle("trend-positive", isPositive);
    element.classList.toggle("trend-negative", !isPositive);
    value.textContent = previous === 0 && current > 0
        ? "Transaksi baru bulan ini"
        : `${percentage > 0 ? "+" : ""}${percentage}% dari bulan lalu`;
}

function updateSummary() {
    const income = transaksi
        .filter(item => item.jenis === "pemasukan")
        .reduce((total, item) => total + item.jumlah, 0);
    const expense = transaksi
        .filter(item => item.jenis === "pengeluaran")
        .reduce((total, item) => total + item.jumlah, 0);
    const balance = income - expense;

    document.getElementById("saldo").textContent = formatRupiah(balance);
    document.getElementById("pemasukan").textContent = formatRupiah(income);
    document.getElementById("pengeluaran").textContent = formatRupiah(expense);

    const now = new Date();
    const currentKey = getMonthKey(now);
    const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = getMonthTotals(currentKey);
    const previousMonth = getMonthTotals(getMonthKey(previousDate));
    const currentBalance = currentMonth.income - currentMonth.expense;
    const previousBalance = previousMonth.income - previousMonth.expense;

    setTrend("saldoTrend", currentBalance, previousBalance, "balance");
    setTrend("pemasukanTrend", currentMonth.income, previousMonth.income, "income");
    setTrend("pengeluaranTrend", currentMonth.expense, previousMonth.expense, "expense");

    document.getElementById("monthlyIncome").textContent = formatRupiah(currentMonth.income);
    document.getElementById("monthlyExpense").textContent = formatRupiah(currentMonth.expense);
    document.getElementById("monthlyBalance").textContent = formatRupiah(currentBalance);
    document.getElementById("monthlyPeriod").textContent =
        new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(now);

    const monthlyStatus = document.getElementById("monthlyStatus");
    const monthlyMessage = document.getElementById("financialMessage");
    const hasActivity = currentMonth.income > 0 || currentMonth.expense > 0;
    monthlyStatus.classList.toggle("is-negative", currentBalance < 0);
    monthlyMessage.textContent = !hasActivity
        ? "Mulai catat transaksi bulan ini."
        : currentBalance < 0
            ? "Pengeluaran bulan ini lebih besar dari pemasukan."
            : "Keuanganmu dalam kondisi baik!";
}

function populateMonthFilter() {
    const selected = chartMonthFilter.value;
    const now = new Date();
    const keys = new Set();
    for (let offset = 11; offset >= 0; offset -= 1) {
        keys.add(getMonthKey(new Date(now.getFullYear(), now.getMonth() - offset, 1)));
    }
    transaksi.forEach(item => {
        keys.add(item.tanggal.slice(0, 7));
    });

    chartMonthFilter.replaceChildren();
    [...keys].sort().forEach(key => {
        const [year, month] = key.split("-").map(Number);
        const option = document.createElement("option");
        option.value = key;
        option.textContent = new Intl.DateTimeFormat("id-ID", {
            month: "long",
            year: "numeric"
        }).format(new Date(year, month - 1, 1));
        chartMonthFilter.appendChild(option);
    });
    chartMonthFilter.value = selected && keys.has(selected) ? selected : getMonthKey(now);
}

function getSelectedMonthTotals() {
    const days = [
        { label: "Sen", income: 0, expense: 0 },
        { label: "Sel", income: 0, expense: 0 },
        { label: "Rab", income: 0, expense: 0 },
        { label: "Kam", income: 0, expense: 0 },
        { label: "Jum", income: 0, expense: 0 },
        { label: "Sab", income: 0, expense: 0 },
        { label: "Min", income: 0, expense: 0 }
    ];

    transaksi.forEach(item => {
        if (item.tanggal.slice(0, 7) !== chartMonthFilter.value) {
            return;
        }
        const [year, month, day] = item.tanggal.split("-").map(Number);
        const weekday = (new Date(year, month - 1, day).getDay() + 6) % 7;
        days[weekday][item.jenis === "pemasukan" ? "income" : "expense"] += item.jumlah;
    });

    return days;
}

function renderChart() {
    const canvas = document.getElementById("financeChart");
    const fallback = document.getElementById("chartFallback");
    if (!window.Chart) {
        canvas.hidden = true;
        fallback.hidden = false;
        return;
    }

    canvas.hidden = false;
    fallback.hidden = true;
    const days = getSelectedMonthTotals();
    const data = {
        labels: days.map(day => day.label),
        datasets: [
            {
                label: "Pemasukan",
                data: days.map(day => day.income),
                backgroundColor: "#2164ed",
                borderRadius: 5,
                maxBarThickness: 26
            },
            {
                label: "Pengeluaran",
                data: days.map(day => day.expense),
                backgroundColor: "#fa7e91",
                borderRadius: 5,
                maxBarThickness: 26
            }
        ]
    };

    if (chart) {
        chart.data = data;
        chart.update();
        return;
    }

    chart = new window.Chart(canvas, {
        type: "bar",
        data,
        options: {
            maintainAspectRatio: false,
            responsive: true,
            interaction: { intersect: false, mode: "index" },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: context => `${context.dataset.label}: ${formatRupiah(context.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: "#929caf", font: { family: "DM Sans", size: 10 } }
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: 3000000,
                    border: { display: false },
                    grid: { color: "#f0f2f7" },
                    ticks: {
                        stepSize: 1000000,
                        color: "#929caf",
                        font: { family: "DM Sans", size: 9 },
                        callback: value => `Rp${new Intl.NumberFormat("id-ID", {
                            notation: "compact",
                            maximumFractionDigits: 1
                        }).format(value)}`
                    }
                }
            }
        }
    });
}

function renderApp() {
    populateMonthFilter();
    updateSummary();
    renderTransactionTables();
    renderChart();
}

function populateCategorySelect(select, type, selectedCategory) {
    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Pilih kategori";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    categories[type].forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });

    if (selectedCategory && categories[type].includes(selectedCategory)) {
        select.value = selectedCategory;
    }
}

function populateCategories(selectedCategory) {
    populateCategorySelect(categoryInput, typeInput.value, selectedCategory);
}

function populateQuickCategories(selectedCategory) {
    populateCategorySelect(quickCategoryInput, quickTypeInput.value, selectedCategory);
}

function populateDashboardCategoryFilter() {
    const select = document.getElementById("dashboardFilterCategory");
    const selectedCategory = select.value;
    select.replaceChildren();

    const allCategories = document.createElement("option");
    allCategories.value = "";
    allCategories.textContent = "Semua kategori";
    select.appendChild(allCategories);

    [...categories.pemasukan, ...categories.pengeluaran].forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });

    select.value = selectedCategory;
}

function getReportRange() {
    const period = document.getElementById("reportPeriod").value;
    if (period === "monthly") {
        const month = document.getElementById("reportMonth").value;
        if (!month) {
            return { error: "Pilih bulan laporan terlebih dahulu." };
        }
        const [year, monthNumber] = month.split("-").map(Number);
        const endDate = new Date(year, monthNumber, 0);
        return { start: `${month}-01`, end: localDateValue(endDate) };
    }

    if (period === "daily" || period === "weekly") {
        const value = document.getElementById("reportDate").value;
        if (!value) {
            return { error: "Pilih tanggal laporan terlebih dahulu." };
        }
        if (period === "daily") {
            return { start: value, end: value };
        }

        const [year, month, day] = value.split("-").map(Number);
        const selectedDate = new Date(year, month - 1, day);
        const monday = new Date(year, month - 1, day - ((selectedDate.getDay() + 6) % 7));
        const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
        return { start: localDateValue(monday), end: localDateValue(sunday) };
    }

    const start = document.getElementById("reportStart").value;
    const end = document.getElementById("reportEnd").value;
    if (!start || !end) {
        return { error: "Isi tanggal awal dan akhir laporan." };
    }
    if (start > end) {
        return { error: "Tanggal awal tidak boleh melewati tanggal akhir." };
    }
    return { start, end };
}

function renderReportChart(rows) {
    const canvas = document.getElementById("reportChart");
    const fallback = document.getElementById("reportChartFallback");
    const empty = document.getElementById("reportChartEmpty");
    if (!window.Chart) {
        canvas.hidden = true;
        fallback.hidden = false;
        empty.hidden = true;
        return;
    }

    fallback.hidden = true;
    canvas.hidden = rows.length === 0;
    empty.hidden = rows.length > 0;
    if (!rows.length) {
        if (reportChart) {
            reportChart.data.labels = [];
            reportChart.data.datasets.forEach(dataset => {
                dataset.data = [];
            });
            reportChart.update();
        }
        return;
    }

    const data = {
        labels: rows.map(row => row.category),
        datasets: [
            {
                label: "Pemasukan",
                data: rows.map(row => row.income),
                backgroundColor: "#4263eb",
                borderRadius: 5
            },
            {
                label: "Pengeluaran",
                data: rows.map(row => row.expense),
                backgroundColor: "#fa7e91",
                borderRadius: 5
            }
        ]
    };
    if (reportChart) {
        reportChart.data = data;
        reportChart.update();
        return;
    }

    reportChart = new window.Chart(canvas, {
        type: "bar",
        data,
        options: {
            indexAxis: "y",
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                legend: { position: "bottom", labels: { usePointStyle: true } },
                tooltip: {
                    callbacks: {
                        label: context => `${context.dataset.label}: ${formatRupiah(context.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: "#f0f2f7" },
                    ticks: {
                        callback: value => `Rp${new Intl.NumberFormat("id-ID", {
                            notation: "compact",
                            maximumFractionDigits: 1
                        }).format(value)}`
                    }
                },
                y: { grid: { display: false } }
            }
        }
    });
}

function renderReport() {
    const range = getReportRange();
    const reportFeedback = document.getElementById("reportFeedback");
    const categoryBody = document.getElementById("reportCategoryBody");
    const transactionsBody = document.getElementById("reportTransactionsBody");
    let rows = [];

    if (range.error) {
        reportFeedback.textContent = range.error;
        reportFeedback.className = "feedback is-error";
        reportFeedback.hidden = false;
        reportTransactions = [];
    } else {
        reportFeedback.hidden = true;
        reportTransactions = sortedTransactions(transaksi).filter(item =>
            item.tanggal >= range.start && item.tanggal <= range.end
        );
        const categoryTotals = new Map();
        reportTransactions.forEach(item => {
            if (!categoryTotals.has(item.kategori)) {
                categoryTotals.set(item.kategori, { category: item.kategori, income: 0, expense: 0 });
            }
            const totals = categoryTotals.get(item.kategori);
            totals[item.jenis === "pemasukan" ? "income" : "expense"] += item.jumlah;
        });
        rows = [...categoryTotals.values()].sort((a, b) =>
            a.category.localeCompare(b.category, "id")
        );
    }

    const totals = reportTransactions.reduce((result, item) => {
        result[item.jenis === "pemasukan" ? "income" : "expense"] += item.jumlah;
        return result;
    }, { income: 0, expense: 0 });
    document.getElementById("reportIncome").textContent = formatRupiah(totals.income);
    document.getElementById("reportExpense").textContent = formatRupiah(totals.expense);
    document.getElementById("reportBalance").textContent = formatRupiah(totals.income - totals.expense);
    document.getElementById("reportCount").textContent = String(reportTransactions.length);
    document.getElementById("exportReportButton").disabled = reportTransactions.length === 0;

    categoryBody.replaceChildren();
    if (!rows.length) {
        addEmptyState(categoryBody, "Belum ada transaksi pada periode ini.", 3);
    } else {
        rows.forEach(item => {
            const row = document.createElement("tr");
            addCell(row, item.category);
            addCell(row, formatRupiah(item.income), "amount-column");
            addCell(row, formatRupiah(item.expense), "amount-column");
            categoryBody.appendChild(row);
        });
    }

    transactionsBody.replaceChildren();
    if (!reportTransactions.length) {
        addEmptyState(transactionsBody, "Belum ada transaksi pada periode ini.", 5);
    } else {
        reportTransactions.forEach(item => {
            const row = document.createElement("tr");
            addCell(row, formatTanggal(item.tanggal));
            addCell(row, item.keterangan);
            addCell(row, item.kategori);
            const typeCell = addCell(row, "");
            const badge = document.createElement("span");
            badge.className = `transaction-type ${item.jenis}`;
            badge.textContent = item.jenis;
            typeCell.appendChild(badge);
            addCell(row, formatRupiah(item.jumlah), "amount-column");
            transactionsBody.appendChild(row);
        });
    }
    renderReportChart(rows);
}

function escapeCsv(value) {
    let text = String(value);
    if (/^[=+\-@]/.test(text)) {
        text = `'${text}`;
    }
    return `"${text.replace(/"/g, '""')}"`;
}

function exportReport() {
    if (!reportTransactions.length) {
        return;
    }
    try {
        const rows = [
            ["Tanggal", "Keterangan", "Kategori", "Jenis", "Jumlah", "Catatan"].map(escapeCsv).join(";")
        ];
        reportTransactions.forEach(item => {
            rows.push([
                item.tanggal,
                item.keterangan,
                item.kategori,
                item.jenis,
                item.jumlah,
                item.catatan || ""
            ].map(escapeCsv).join(";"));
        });

        const blob = new Blob([`\uFEFF${rows.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "laporan-keuanganku.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
        const reportFeedback = document.getElementById("reportFeedback");
        reportFeedback.textContent = `Laporan belum dapat diekspor: ${error.message}`;
        reportFeedback.className = "feedback is-error";
        reportFeedback.hidden = false;
    }
}

function renderCategoryList(type, list) {
    const container = document.getElementById(type === "pemasukan" ? "incomeCategoryList" : "expenseCategoryList");
    container.replaceChildren();
    if (!categories[type].length) {
        const empty = document.createElement("li");
        empty.className = "category-empty";
        empty.textContent = "Belum ada kategori.";
        container.appendChild(empty);
        return;
    }

    categories[type].forEach(category => {
        const item = document.createElement("li");
        item.className = "category-item";
        const name = document.createElement("span");
        name.className = "category-label";
        name.textContent = category;
        const actions = document.createElement("div");
        actions.className = "category-actions";
        ["edit", "delete"].forEach(action => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = `row-action ${action === "delete" ? "delete" : ""}`;
            button.dataset.categoryAction = action;
            button.dataset.categoryType = type;
            button.dataset.category = category;
            button.textContent = action === "edit" ? "Ubah" : "Hapus";
            button.setAttribute("aria-label", `${action === "edit" ? "Ubah" : "Hapus"} kategori ${category}`);
            actions.appendChild(button);
        });
        item.append(name, actions);
        list.appendChild(item);
    });
}

function renderCategories() {
    renderCategoryList("pemasukan", document.getElementById("incomeCategoryList"));
    renderCategoryList("pengeluaran", document.getElementById("expenseCategoryList"));
}

function updateReportControls() {
    const period = document.getElementById("reportPeriod").value;
    document.getElementById("reportDateControl").hidden = period !== "daily" && period !== "weekly";
    document.getElementById("reportMonthControl").hidden = period !== "monthly";
    document.getElementById("reportCustomControls").hidden = period !== "custom";
}

function resetCategoryForm() {
    const categoryForm = document.getElementById("categoryForm");
    categoryForm.reset();
    categoryForm.dataset.originalType = "";
    document.getElementById("originalCategory").value = "";
    document.getElementById("categoryType").disabled = false;
    document.getElementById("categoryFormTitle").textContent = "Tambah kategori";
    document.getElementById("saveCategoryButton").textContent = "Simpan Kategori";
    document.getElementById("cancelCategoryEdit").hidden = true;
}

function startCategoryEdit(type, category) {
    const categoryForm = document.getElementById("categoryForm");
    categoryForm.dataset.originalType = type;
    document.getElementById("originalCategory").value = category;
    document.getElementById("categoryType").value = type;
    document.getElementById("categoryType").disabled = true;
    document.getElementById("categoryName").value = category;
    document.getElementById("categoryFormTitle").textContent = "Ubah kategori";
    document.getElementById("saveCategoryButton").textContent = "Simpan Perubahan";
    document.getElementById("cancelCategoryEdit").hidden = false;
    document.getElementById("categoryName").focus();
}

async function handleCategoryAction(event) {
    const button = event.target.closest("button[data-category-action]");
    if (!button) {
        return;
    }
    const { categoryAction, categoryType, category } = button.dataset;
    if (categoryAction === "edit") {
        startCategoryEdit(categoryType, category);
        return;
    }

    if (!window.confirm(`Hapus kategori "${category}"?`)) {
        return;
    }
    try {
        await apiFetch(`/categories.php?id=${categoryIds[categoryType][category]}`, { method: "DELETE" });
        await loadBackendState();
        renderCategories();
        populateCategorySelect(categoryInput, typeInput.value);
        populateCategorySelect(quickCategoryInput, quickTypeInput.value);
        populateDashboardCategoryFilter();
        renderApp();
        showCategoryFeedback("Kategori berhasil dihapus.", "success");
    } catch (error) {
        showCategoryFeedback(error.message, "error");
    }
}

async function saveCategory(event) {
    event.preventDefault();
    const categoryForm = document.getElementById("categoryForm");
    if (!categoryForm.reportValidity()) {
        return;
    }

    const type = document.getElementById("categoryType").value;
    const name = document.getElementById("categoryName").value.trim();
    const originalType = categoryForm.dataset.originalType;
    const originalName = document.getElementById("originalCategory").value;
    const duplicate = categories[type].some(category =>
        category.toLocaleLowerCase("id-ID") === name.toLocaleLowerCase("id-ID") &&
        !(type === originalType && category === originalName)
    );
    if (!name || duplicate) {
        showCategoryFeedback(
            duplicate ? "Nama kategori tersebut sudah tersedia untuk jenis transaksi ini." : "Nama kategori tidak boleh kosong.",
            "error"
        );
        return;
    }

    try {
        if (originalType) {
            await apiFetch(`/categories.php?id=${categoryIds[originalType][originalName]}`, {
                method: "PUT",
                body: JSON.stringify({ name })
            });
        } else {
            await apiFetch("/categories.php", {
                method: "POST",
                body: JSON.stringify({ type, name })
            });
        }
        await loadBackendState();
        resetCategoryForm();
        renderCategories();
        populateCategorySelect(categoryInput, typeInput.value);
        populateCategorySelect(quickCategoryInput, quickTypeInput.value);
        populateDashboardCategoryFilter();
        renderApp();
        showCategoryFeedback(originalType ? "Perubahan kategori berhasil disimpan." : "Kategori berhasil ditambahkan.", "success");
    } catch (error) {
        showCategoryFeedback(error.message, "error");
    }
}

function resetForm() {
    form.reset();
    document.getElementById("transactionId").value = "";
    typeInput.value = "pemasukan";
    populateCategories();
    dateInput.value = localDateValue(new Date());
    document.getElementById("formTitle").textContent = "Tambah transaksi baru";
    document.getElementById("saveTransactionButton").querySelector("span").textContent = "Simpan Transaksi";
    document.getElementById("cancelEditButton").hidden = true;
}

function resetQuickForm() {
    quickForm.reset();
    quickTypeInput.value = "pemasukan";
    populateQuickCategories();
    quickDateInput.value = localDateValue(new Date());
}

async function persistTransaction(item, existing) {
    const categoryId = categoryIds[item.jenis][item.kategori];
    if (!categoryId) {
        showGlobalFeedback("Kategori transaksi tidak tersedia.", "error");
        return false;
    }

    try {
        await apiFetch(existing ? `/transactions.php?id=${encodeURIComponent(existing.id)}` : "/transactions.php", {
            method: existing ? "PUT" : "POST",
            body: JSON.stringify({
                date: item.tanggal,
                name: item.keterangan,
                type: item.jenis,
                category_id: categoryId,
                amount: item.jumlah,
                note: item.catatan
            })
        });
        await loadBackendState();
        renderApp();
        return true;
    } catch (error) {
        showGlobalFeedback(error.message, "error");
        return false;
    }
}

function openTransactionForm() {
    showView("transactions");
    resetForm();
    hideFeedback();
    formPanel.hidden = false;
    document.getElementById("toggleFormButton").setAttribute("aria-expanded", "true");
    document.getElementById("keterangan").focus();
    formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeTransactionForm() {
    formPanel.hidden = true;
    document.getElementById("toggleFormButton").setAttribute("aria-expanded", "false");
    resetForm();
    hideFeedback();
}

function showView(viewName) {
    const module = MODULES[viewName];
    const isDashboard = viewName === "dashboard";
    const isTransactions = viewName === "transactions";
    const isReports = viewName === "reports";
    const isCategories = viewName === "categories";
    if (!isDashboard && !isTransactions && !isReports && !isCategories && !module) {
        return;
    }

    document.getElementById("dashboardView").hidden = !isDashboard;
    document.getElementById("transactionsView").hidden = !isTransactions;
    document.getElementById("reportsView").hidden = !isReports;
    document.getElementById("categoriesView").hidden = !isCategories;
    document.getElementById("moduleView").hidden = !module;

    if (module) {
        document.getElementById("moduleEyebrow").textContent = module.eyebrow;
        document.getElementById("moduleTitle").textContent = module.title;
        document.getElementById("moduleDescription").textContent = module.description;
        document.getElementById("moduleStatus").textContent = module.status;
        document.getElementById("moduleMessage").textContent = module.message;
        document.getElementById("moduleIcon").setAttribute("href", module.icon);

        const details = document.getElementById("moduleDetails");
        details.replaceChildren();
        module.details.forEach(detail => {
            const item = document.createElement("li");
            item.textContent = detail;
            details.appendChild(item);
        });
    }

    document.getElementById("pageTitle").textContent = isDashboard
        ? "Halo, Natalia! 👋"
        : isTransactions ? "Kelola Transaksi"
            : isReports ? "Laporan Keuangan"
                : isCategories ? "Kategori Transaksi" : module.title;

    document.querySelectorAll(".sidebar-nav [data-view]").forEach(button => {
        const active = button.dataset.view === viewName;
        button.classList.toggle("is-active", active);
        if (active) {
            button.setAttribute("aria-current", "page");
        } else {
            button.removeAttribute("aria-current");
        }
    });

    if (isDashboard) {
        renderChart();
    } else if (isReports) {
        renderReport();
    } else if (isCategories) {
        renderCategories();
    }
}

function editTransaction(id) {
    const item = transaksi.find(transaction => transaction.id === id);
    if (!item) {
        showFeedback("Transaksi yang ingin diubah tidak ditemukan.", "error");
        return;
    }

    showView("transactions");
    formPanel.hidden = false;
    document.getElementById("transactionId").value = item.id;
    dateInput.value = item.tanggal;
    document.getElementById("keterangan").value = item.keterangan;
    typeInput.value = item.jenis;
    populateCategories(item.kategori);
    document.getElementById("jumlah").value = item.jumlah;
    document.getElementById("catatan").value = item.catatan || "";
    document.getElementById("formTitle").textContent = "Ubah transaksi";
    document.getElementById("saveTransactionButton").querySelector("span").textContent = "Simpan Perubahan";
    document.getElementById("cancelEditButton").hidden = false;
    document.getElementById("toggleFormButton").setAttribute("aria-expanded", "true");
    hideFeedback();
    formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("keterangan").focus();
}

async function deleteTransaction(id) {
    const item = transaksi.find(transaction => transaction.id === id);
    if (!item) {
        showFeedback("Transaksi yang ingin dihapus tidak ditemukan.", "error");
        return;
    }

    if (!window.confirm(`Hapus transaksi "${item.keterangan}"?`)) {
        return;
    }

    try {
        await apiFetch(`/transactions.php?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        await loadBackendState();
        renderApp();
        showGlobalFeedback("Transaksi berhasil dihapus.", "success");
    } catch (error) {
        showGlobalFeedback(error.message, "error");
    }
}

function handleTransactionAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }

    if (button.dataset.action === "edit") {
        editTransaction(button.dataset.id);
    } else if (button.dataset.action === "delete") {
        deleteTransaction(button.dataset.id);
    }
}

document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => showView(button.dataset.view));
});

document.querySelectorAll("[data-view-link]").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        showView(link.dataset.viewLink);
    });
});

document.querySelectorAll('[data-action="add-transaction"]').forEach(button => {
    button.addEventListener("click", openTransactionForm);
});

document.querySelector('[data-action="logout"]').addEventListener("click", async () => {
    try {
        await apiFetch("/auth.php?action=logout", { method: "POST", body: "{}" });
        isAuthenticated = false;
        transaksi = [];
        showView("dashboard");
        document.getElementById("authGate").hidden = false;
        document.getElementById("loginForm").reset();
    } catch (error) {
        showGlobalFeedback(error.message, "error");
    }
});

document.querySelector('[data-action="notifications"]').addEventListener("click", () => {
    showGlobalFeedback("Belum ada notifikasi baru.", "info");
});

document.getElementById("toggleFormButton").addEventListener("click", () => {
    if (formPanel.hidden) {
        resetForm();
        hideFeedback();
        openTransactionForm();
    } else {
        closeTransactionForm();
    }
});

document.getElementById("closeFormButton").addEventListener("click", closeTransactionForm);
document.getElementById("cancelEditButton").addEventListener("click", closeTransactionForm);
typeInput.addEventListener("change", () => populateCategories());
quickTypeInput.addEventListener("change", () => populateQuickCategories());
chartMonthFilter.addEventListener("change", renderChart);

["dashboardSearch", "dashboardFilterType", "dashboardFilterCategory"].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener(id === "dashboardSearch" ? "input" : "change", renderTransactionTables);
});

quickForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!quickForm.reportValidity()) {
        return;
    }

    const amount = Number(document.getElementById("quickJumlah").value);
    const item = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        tanggal: quickDateInput.value,
        keterangan: document.getElementById("quickKeterangan").value.trim(),
        kategori: quickCategoryInput.value,
        jenis: quickTypeInput.value,
        jumlah: amount,
        catatan: document.getElementById("quickCatatan").value.trim(),
        createdAt: Date.now()
    };

    if (!item.keterangan || !Number.isFinite(amount) || amount <= 0 ||
        !categories[item.jenis].includes(item.kategori)) {
        showGlobalFeedback("Periksa kembali nama, jumlah, dan kategori transaksi.", "error");
        return;
    }

    const saved = await persistTransaction(item, null);
    resetQuickForm();
    if (saved) {
        showGlobalFeedback("Transaksi berhasil ditambahkan.", "success");
    }
});

form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) {
        return;
    }

    const amount = Number(document.getElementById("jumlah").value);
    if (!Number.isFinite(amount) || amount <= 0) {
        showFeedback("Jumlah transaksi harus lebih besar dari nol.", "error");
        return;
    }

    const idField = document.getElementById("transactionId");
    const existing = transaksi.find(item => item.id === idField.value);
    const item = {
        id: existing ? existing.id : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        tanggal: dateInput.value,
        keterangan: document.getElementById("keterangan").value.trim(),
        kategori: categoryInput.value,
        jenis: typeInput.value,
        jumlah: amount,
        catatan: document.getElementById("catatan").value.trim(),
        createdAt: existing ? existing.createdAt : Date.now()
    };

    if (!item.keterangan || !categories[item.jenis].includes(item.kategori)) {
        showFeedback("Periksa kembali nama transaksi dan kategorinya.", "error");
        return;
    }

    const saved = await persistTransaction(item, existing);
    resetForm();
    formPanel.hidden = true;
    document.getElementById("toggleFormButton").setAttribute("aria-expanded", "false");
    if (saved) {
        showGlobalFeedback(existing ? "Perubahan transaksi berhasil disimpan." : "Transaksi berhasil ditambahkan.", "success");
    }
});

transactionBody.addEventListener("click", handleTransactionAction);
recentBody.addEventListener("click", handleTransactionAction);

["searchTransaksi", "filterJenis", "filterMulai", "filterSampai"].forEach(id => {
    const input = document.getElementById(id);
    input.addEventListener(id === "searchTransaksi" ? "input" : "change", renderTransactionTables);
});

document.getElementById("clearFiltersButton").addEventListener("click", () => {
    document.getElementById("searchTransaksi").value = "";
    document.getElementById("filterJenis").value = "";
    document.getElementById("filterMulai").value = "";
    document.getElementById("filterSampai").value = "";
    renderTransactionTables();
});

const reportPeriodInput = document.getElementById("reportPeriod");
reportPeriodInput.addEventListener("change", () => {
    updateReportControls();
    renderReport();
});
["reportDate", "reportMonth", "reportStart", "reportEnd"].forEach(id => {
    document.getElementById(id).addEventListener("change", renderReport);
});
document.getElementById("exportReportButton").addEventListener("click", exportReport);

document.getElementById("categoryForm").addEventListener("submit", saveCategory);
document.getElementById("cancelCategoryEdit").addEventListener("click", resetCategoryForm);
document.getElementById("incomeCategoryList").addEventListener("click", handleCategoryAction);
document.getElementById("expenseCategoryList").addEventListener("click", handleCategoryAction);

dateInput.value = localDateValue(new Date());
quickDateInput.value = localDateValue(new Date());
const today = localDateValue(new Date());
document.getElementById("reportDate").value = today;
document.getElementById("reportMonth").value = getMonthKey(new Date());
document.getElementById("reportStart").value = today;
document.getElementById("reportEnd").value = today;
updateReportControls();
populateCategories();
populateQuickCategories();
populateDashboardCategoryFilter();
renderCategories();
document.getElementById("toggleFormButton").setAttribute("aria-expanded", "false");

function showAuthFeedback(message, kind) {
    const authFeedback = document.getElementById("authFeedback");
    authFeedback.textContent = message;
    authFeedback.className = `feedback${kind ? ` is-${kind}` : ""}`;
    authFeedback.hidden = false;
}

function applyUserProfile(user) {
    const name = user.name || "Pengguna";
    document.getElementById("pageTitle").textContent = `Halo, ${name}! 👋`;
    const profileChip = document.querySelector(".profile-chip");
    profileChip.querySelector(".avatar").textContent = name.charAt(0).toUpperCase();
    profileChip.children[1].textContent = name;
}

async function enterApplication() {
    isAuthenticated = true;
    document.getElementById("authGate").hidden = true;
    await loadBackendState();
    populateCategories();
    populateQuickCategories();
    populateDashboardCategoryFilter();
    renderCategories();
    renderApp();
}

async function checkSession() {
    try {
        const payload = await apiFetch("/auth.php?action=me");
        applyUserProfile(payload.user);
        await enterApplication();
    } catch (error) {
        document.getElementById("authGate").hidden = false;
    }
}

document.getElementById("authModeButton").addEventListener("click", () => {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const switchingToRegister = loginForm.hidden;
    loginForm.hidden = !switchingToRegister;
    registerForm.hidden = switchingToRegister;
    document.getElementById("authTitle").textContent = switchingToRegister ? "Masuk ke akun" : "Buat akun baru";
    document.getElementById("authDescription").textContent = switchingToRegister
        ? "Kelola keuanganmu dengan aman."
        : "Daftar untuk menyimpan data di akunmu.";
    document.getElementById("authModeButton").textContent = switchingToRegister
        ? "Belum punya akun? Daftar"
        : "Sudah punya akun? Masuk";
    document.getElementById("authFeedback").hidden = true;
});

document.getElementById("loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    try {
        const payload = await apiFetch("/auth.php?action=login", {
            method: "POST",
            body: JSON.stringify({
                email: document.getElementById("loginEmail").value,
                password: document.getElementById("loginPassword").value
            })
        });
        applyUserProfile(payload.user);
        await enterApplication();
    } catch (error) {
        showAuthFeedback(error.message, "error");
    }
});

document.getElementById("registerForm").addEventListener("submit", async event => {
    event.preventDefault();
    try {
        const payload = await apiFetch("/auth.php?action=register", {
            method: "POST",
            body: JSON.stringify({
                name: document.getElementById("registerName").value,
                email: document.getElementById("registerEmail").value,
                password: document.getElementById("registerPassword").value
            })
        });
        applyUserProfile(payload.user);
        await enterApplication();
    } catch (error) {
        showAuthFeedback(error.message, "error");
    }
});

document.getElementById("authGate").hidden = false;
checkSession();
