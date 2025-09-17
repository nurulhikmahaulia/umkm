// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdr0fxnYpfeG2b6GlTQ_-4TqpmGk2uvOk",
  authDomain: "insan-cemerlang-80713.firebaseapp.com",
  projectId: "insan-cemerlang-80713",
  storageBucket: "insan-cemerlang-80713.appspot.com",
  messagingSenderId: "1016858047753",
  appId: "1:1016858047753:web:0534dda2085c2adab68fd8",
  measurementId: "G-E7G0K9XTCD"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Reference to the barang collection
const barangCollection = db.collection("barang");
const penjualanCollection = db.collection("penjualan");

// Initialize jsPDF
const { jsPDF } = window.jspdf;

// Global variables for sales
let keranjangPenjualan = [];
let daftarBarang = [];

// Function to add new item
async function tambahBarang(nama, stok, hargaSatuan) {
  try {
    await barangCollection.add({
      nama: nama,
      stok: parseInt(stok),
      hargaSatuan: parseInt(hargaSatuan),
      tanggalDitambahkan: new Date()
    });
    return true;
  } catch (e) {
    console.error("Error adding document: ", e);
    return false;
  }
}

// Function to get all items
async function ambilDaftarBarang() {
  const querySnapshot = await barangCollection.orderBy("tanggalDitambahkan", "desc").get();
  let daftarBarang = [];
  querySnapshot.forEach((doc) => {
    daftarBarang.push({
      id: doc.id,
      nama: doc.data().nama,
      stok: doc.data().stok,
      hargaSatuan: doc.data().hargaSatuan
    });
  });
  return daftarBarang;
}

// Function to delete item
async function hapusBarang(id) {
  try {
    await barangCollection.doc(id).delete();
    return true;
  } catch (e) {
    console.error("Error deleting document: ", e);
    return false;
  }
}

// Function to get single item
async function ambilBarang(id) {
  const docRef = barangCollection.doc(id);
  const docSnap = await docRef.get();
  if (docSnap.exists) {
    return {
      id: docSnap.id,
      ...docSnap.data()
    };
  } else {
    console.log("No such document!");
    return null;
  }
}

// Function to update item
async function ubahBarang(id, nama, stok, hargaSatuan) {
  try {
    const docRef = barangCollection.doc(id);
    await docRef.update({
      nama: nama,
      stok: parseInt(stok),
      hargaSatuan: parseInt(hargaSatuan)
    });
    return true;
  } catch (e) {
    console.error("Error updating document: ", e);
    return false;
  }
}

// Function to record sale
async function catatPenjualan(items, total) {
  try {
    await penjualanCollection.add({
      items: items,
      total: total,
      tanggal: firebase.firestore.FieldValue.serverTimestamp()
    });
    return true;
  } catch (e) {
    console.error("Error adding sale: ", e);
    return false;
  }
}

// Function to get today's sales
async function ambilPenjualanHariIni() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const querySnapshot = await penjualanCollection
    .where("tanggal", ">=", today)
    .orderBy("tanggal", "desc")
    .get();
  
  let daftarPenjualan = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    daftarPenjualan.push({
      id: doc.id,
      items: data.items,
      total: data.total,
      tanggal: data.tanggal ? data.tanggal.toDate() : new Date()
    });
  });
  return daftarPenjualan;
}

// Function to format numbers with thousand separators
function formatNumber(num) {
  return new Intl.NumberFormat('id-ID').format(num);
}

// Function to refresh table data
async function refreshData() {
  daftarBarang = await ambilDaftarBarang();
  const tabelBody = $("#tabel-stok tbody");
  tabelBody.empty();
  
  let totalBarang = 0;
  let totalStok = 0;
  let totalNilai = 0;
  
  daftarBarang.forEach((barang, index) => {
    const total = barang.stok * barang.hargaSatuan;
    totalBarang++;
    totalStok += parseInt(barang.stok);
    totalNilai += total;
    
    tabelBody.append(`
      <tr>
        <td>${index + 1}</td>
        <td>${barang.nama}</td>
        <td>${barang.stok}</td>
        <td>Rp ${formatNumber(barang.hargaSatuan)}</td>
        <td class="total-nilai">Rp ${formatNumber(total)}</td>
        <td class="action-buttons">
          <button class="btn btn-sm btn-warning btn-edit" data-id="${barang.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-hapus" data-id="${barang.id}">
            <i class="fas fa-trash"></i>
          </button>
          <button class="btn btn-sm btn-success btn-share" data-id="${barang.id}">
            <i class="fas fa-share-alt"></i>
          </button>
        </td>
      </tr>
    `);
  });
  
  // Update summary cards
  $("#total-barang").text(totalBarang);
  $("#total-stok").text(totalStok);
  $("#total-nilai").text(`Rp ${formatNumber(totalNilai)}`);
  
  // Update sales summary
  await updateSalesSummary();
  
  // Refresh dropdown barang
  refreshDropdownBarang();
  
  // Add event listeners to action buttons
  $(".btn-edit").click(async function() {
    const id = $(this).data("id");
    const barang = await ambilBarang(id);
    if (barang) {
      $("#editId").val(barang.id);
      $("#editNamaBarang").val(barang.nama);
      $("#editStokBarang").val(barang.stok);
      $("#editHargaBarang").val(barang.hargaSatuan);
      $("#editBarangModal").modal("show");
    }
  });
  
  $(".btn-hapus").click(async function() {
    const id = $(this).data("id");
    if (confirm("Apakah Anda yakin ingin menghapus barang ini?")) {
      const success = await hapusBarang(id);
      if (success) {
        refreshData();
      } else {
        alert("Gagal menghapus barang");
      }
    }
  });
  
  $(".btn-share").click(async function() {
    const id = $(this).data("id");
    const barang = await ambilBarang(id);
    if (barang) {
      const total = barang.stok * barang.hargaSatuan;
      const message = `Info Barang:\nNama: ${barang.nama}\nStok: ${barang.stok}\nHarga: Rp ${formatNumber(barang.hargaSatuan)}\nTotal Nilai: Rp ${formatNumber(total)}`;
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
    }
  });
}

// Function to refresh dropdown barang
function refreshDropdownBarang() {
  console.log("Refresh dropdown barang dipanggil");
  const dropdown = $("#barangSelect");
  dropdown.empty();
  dropdown.append('<option value="">-- Pilih Barang --</option>');
  
  daftarBarang.forEach(barang => {
    if (barang.stok > 0) {
      dropdown.append(`<option value="${barang.id}">${barang.nama}</option>`);
    }
  });
  console.log("Dropdown barang diisi dengan " + daftarBarang.length + " barang");
}

// Function to refresh keranjang
function refreshKeranjang() {
  const tabelBody = $("#tabel-keranjang tbody");
  tabelBody.empty();
  
  let total = 0;
  
  keranjangPenjualan.forEach((item, index) => {
    total += item.subtotal;
    tabelBody.append(`
      <tr>
        <td>${item.nama}</td>
        <td>${item.jumlah}</td>
        <td>Rp ${formatNumber(item.harga)}</td>
        <td>Rp ${formatNumber(item.subtotal)}</td>
        <td>
          <button class="btn btn-sm btn-danger btn-hapus-keranjang" data-index="${index}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `);
  });
  
  $("#totalKeranjang").text(`Rp ${formatNumber(total)}`);
  
  // Add event listeners to delete buttons
  $(".btn-hapus-keranjang").click(function() {
    const index = $(this).data("index");
    keranjangPenjualan.splice(index, 1);
    refreshKeranjang();
  });
}

// Function to refresh riwayat penjualan
async function refreshRiwayatPenjualan() {
  const riwayatContainer = $("#riwayatPenjualan");
  riwayatContainer.empty();
  
  const penjualanHariIni = await ambilPenjualanHariIni();
  
  if (penjualanHariIni.length === 0) {
    riwayatContainer.append(`
      <div class="text-center py-4 text-muted">
        <i class="fas fa-receipt fa-2x mb-2"></i>
        <p>Belum ada transaksi hari ini</p>
      </div>
    `);
  } else {
    penjualanHariIni.forEach(penjualan => {
      const waktu = penjualan.tanggal.toLocaleTimeString('id-ID');
      const itemsList = penjualan.items.map(item => 
        `${item.nama} (${item.jumlah} x Rp ${formatNumber(item.harga)})`
      ).join(', ');
      
      riwayatContainer.append(`
        <div class="list-group-item">
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">Penjualan</h6>
            <small>${waktu}</small>
          </div>
          <p class="mb-1">${itemsList}</p>
          <div class="d-flex justify-content-between">
            <small>Total: Rp ${formatNumber(penjualan.total)}</small>
          </div>
        </div>
      `);
    });
  }
  
  await updateSalesSummary();
}

// Function to update sales summary
async function updateSalesSummary() {
  const penjualanHariIni = await ambilPenjualanHariIni();
  const totalPenjualan = penjualanHariIni.reduce((total, penjualan) => total + penjualan.total, 0);
  $("#total-penjualan").text(`Rp ${formatNumber(totalPenjualan)}`);
}

// Function to export to PDF
function exportToPDF() {
  const doc = new jsPDF();
  const table = document.getElementById("tabel-stok");
  
  // Title
  doc.setFontSize(18);
  doc.text("LAPORAN STOK BARANG UMKM", 105, 15, { align: "center" });
  doc.setFontSize(12);
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 105, 22, { align: "center" });
  
  // Table
  doc.autoTable({
    html: table,
    startY: 30,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [78, 115, 223],
      textColor: 255
    },
    alternateRowStyles: {
      fillColor: [240, 240, 240]
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 25 },
      3: { cellWidth: 40 },
      4: { cellWidth: 40 },
      5: { cellWidth: 40 }
    }
  });
  
  // Summary
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(`Total Barang: ${$("#total-barang").text()}`, 14, finalY);
  doc.text(`Total Stok: ${$("#total-stok").text()}`, 14, finalY + 7);
  doc.text(`Total Nilai: ${$("#total-nilai").text()}`, 14, finalY + 14);
  
  // Save the PDF
  doc.save(`Laporan-Stok-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// Real-time listener for items
barangCollection.onSnapshot((snapshot) => {
  refreshData();
  refreshDropdownBarang();
});

// Document ready
$(document).ready(function() {
  // Load initial data
  refreshData();

  // Tab navigation
  $('.nav-link').click(function() {
    const target = $(this).data('bs-target');
    if (target === 'penjualan-tab') {
      $('#penjualan-tab').tab('show');
      refreshRiwayatPenjualan();
      refreshDropdownBarang(); // Pastikan dropdown di-refresh saat beralih ke tab penjualan
    } else if (target === 'stok-tab') {
      $('#stok-tab').tab('show');
    }
  });

  // Event listener khusus untuk tab penjualan
  $('#penjualan-tab').on('shown.bs.tab', function (e) {
    refreshDropdownBarang();
    refreshRiwayatPenjualan();
  });

  // Go to sales button
  $("#btnGotoPenjualan").click(function() {
    $('#penjualan-tab').tab('show');
    refreshRiwayatPenjualan();
    refreshDropdownBarang(); // Pastikan dropdown di-refresh saat beralih ke tab penjualan
  });

  // Refresh button click
  $("#btnRefresh").click(function() {
    refreshData();
  });

  // Refresh sales button
  $("#btnRefreshPenjualan").click(function() {
    refreshRiwayatPenjualan();
  });

  // Save new item
  $("#btnSimpanBarang").click(async function() {
    const nama = $("#namaBarang").val();
    const stok = $("#stokBarang").val();
    const harga = $("#hargaBarang").val();
    
    if (nama && stok && harga) {
      const success = await tambahBarang(nama, stok, harga);
      if (success) {
        $("#tambahBarangModal").modal("hide");
        $("#formTambahBarang")[0].reset();
        refreshData();
      } else {
        alert("Gagal menambah barang");
      }
    } else {
      alert("Harap isi semua field");
    }
  });

  // Update item
  $("#btnUpdateBarang").click(async function() {
    const id = $("#editId").val();
    const nama = $("#editNamaBarang").val();
    const stok = $("#editStokBarang").val();
    const harga = $("#editHargaBarang").val();
    
    if (id && nama && stok && harga) {
      const success = await ubahBarang(id, nama, stok, harga);
      if (success) {
        $("#editBarangModal").modal("hide");
        refreshData();
      } else {
        alert("Gagal mengupdate barang");
      }
    } else {
      alert("Harap isi semua field");
    }
  });

  // Print report
  $("#btnPrint").click(function() {
    window.print();
  });

  // Export PDF
  $("#btnExportPDF").click(function() {
    exportToPDF();
  });

  // When barang select changes
  $("#barangSelect").change(async function() {
    const id = $(this).val();
    if (id) {
      const barang = await ambilBarang(id);
      if (barang) {
        $("#stokInfo").val(barang.stok);
        $("#hargaInfo").val(formatNumber(barang.hargaSatuan));
        $("#jumlahJual").attr("max", barang.stok);
      }
    } else {
      $("#stokInfo").val("");
      $("#hargaInfo").val("");
      $("#jumlahJual").val("");
    }
  });

  // Add to cart
  $("#btnTambahKeKeranjang").click(function() {
    const barangId = $("#barangSelect").val();
    const jumlah = parseInt($("#jumlahJual").val());
    
    if (!barangId) {
      alert("Pilih barang terlebih dahulu");
      return;
    }
    
    if (!jumlah || jumlah < 1) {
      alert("Masukkan jumlah yang valid");
      return;
    }
    
    const stok = parseInt($("#stokInfo").val());
    if (jumlah > stok) {
      alert("Jumlah melebihi stok yang tersedia");
      return;
    }
    
    const barang = daftarBarang.find(b => b.id === barangId);
    if (barang) {
      // Check if item already in cart
      const existingItemIndex = keranjangPenjualan.findIndex(item => item.id === barangId);
      
      if (existingItemIndex >= 0) {
        // Update existing item
        const newJumlah = keranjangPenjualan[existingItemIndex].jumlah + jumlah;
        if (newJumlah > stok) {
          alert("Total jumlah melebihi stok yang tersedia");
          return;
        }
        keranjangPenjualan[existingItemIndex].jumlah = newJumlah;
        keranjangPenjualan[existingItemIndex].subtotal = newJumlah * barang.hargaSatuan;
      } else {
        // Add new item to cart
        keranjangPenjualan.push({
          id: barangId,
          nama: barang.nama,
          harga: barang.hargaSatuan,
          jumlah: jumlah,
          subtotal: jumlah * barang.hargaSatuan
        });
      }
      
      refreshKeranjang();
      $("#jumlahJual").val("");
    }
  });

  // Process sale
  $("#btnProsesPenjualan").click(async function() {
    if (keranjangPenjualan.length === 0) {
      alert("Keranjang penjualan kosong");
      return;
    }
    
    // Update stock and record sale
    let success = true;
    const total = keranjangPenjualan.reduce((sum, item) => sum + item.subtotal, 0);
    
    for (const item of keranjangPenjualan) {
      const barang = await ambilBarang(item.id);
      if (barang) {
        const newStok = barang.stok - item.jumlah;
        const updateSuccess = await ubahBarang(item.id, barang.nama, newStok, barang.hargaSatuan);
        if (!updateSuccess) {
          success = false;
          break;
        }
      }
    }
    
    if (success) {
      // Record sale
      const saleSuccess = await catatPenjualan(keranjangPenjualan, total);
      if (saleSuccess) {
        alert("Penjualan berhasil dicatat");
        keranjangPenjualan = [];
        refreshKeranjang();
        refreshRiwayatPenjualan();
        refreshData();
      } else {
        alert("Gagal mencatat penjualan");
      }
    } else {
      alert("Gagal memperbarui stok barang");
    }
  });

  // Clear cart
  $("#btnKosongkanKeranjang").click(function() {
    keranjangPenjualan = [];
    refreshKeranjang();
  });
});