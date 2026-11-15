
/* ==========================================
   MONEYTRACK - MAIN JAVASCRIPT
   Clean Version 3.0
========================================== */

document.addEventListener("DOMContentLoaded", function () {

  "use strict";

  // Belum login -> aplikasi tidak dijalankan (layar login dari auth.js tampil)
  if (!window.MT_USER) return;
  const UID = window.MT_USER.id;

  // ==========================================
  // 1. KONFIGURASI DAN ELEMEN HTML
  // ==========================================

  const STORAGE_KEY = "moneytrack_transaksi_v2_" + UID;
  const PHOTO_KEY = "moneytrack_foto_dev_" + UID;
  const TARGET_KEY = "moneytrack_target_tabungan_" + UID;

  const JENIS = ["pemasukan", "pengeluaran", "tabungan"];
  const LABEL = { pemasukan: "Pemasukan", pengeluaran: "Pengeluaran", tabungan: "Tabungan" };
  let filterAktif = "semua";

  const form = document.getElementById("formTransaksi");
  const keteranganInput = document.getElementById("keterangan");
  const nominalInput = document.getElementById("nominal");
  const jenisInput = document.getElementById("jenis");

  const daftar = document.getElementById("daftarTransaksi");

  const saldoElement = document.getElementById("saldo");
  const pemasukanElement = document.getElementById("pemasukan");
  const pengeluaranElement = document.getElementById("pengeluaran");

  const tanggalElement = document.getElementById("tanggalSekarang");

  const masukLabel = document.getElementById("grafikPemasukanLabel");
  const keluarLabel = document.getElementById("grafikPengeluaranLabel");

  const masukBar = document.getElementById("grafikPemasukanBar");
  const keluarBar = document.getElementById("grafikPengeluaranBar");

  const uploadFoto = document.getElementById("uploadFoto");
  const fotoProfil = document.getElementById("fotoProfilDev");
  const fotoUtama = document.getElementById("fotoProfilUtama");
  const tabunganElement = document.getElementById("tabungan");
  const tabunganLabel = document.getElementById("grafikTabunganLabel");
  const tabunganBar = document.getElementById("grafikTabunganBar");
  const filterJenis = document.getElementById("filterJenis");
  const targetInput = document.getElementById("targetInput");
  const targetInfo = document.getElementById("targetInfo");
  const targetBar = document.getElementById("targetBar");
  const tombolTarget = document.getElementById("tombolTarget");

  // ==========================================
  // 2. FORMAT RUPIAH
  // ==========================================

  function rupiah(angka) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(angka);
  }

  // ==========================================
  // 3. MEMBACA PENYIMPANAN
  // ==========================================

  function bacaTransaksi() {
    try {
      let data = localStorage.getItem(STORAGE_KEY);

      // Ambil data dari penyimpanan lama jika ada
      // Data lama (sebelum ada member) otomatis jadi milik Developer
      if (!data && window.MT_USER.role === "developer") {
        data = localStorage.getItem("moneytrack_transaksi_v2") ||
               localStorage.getItem("moneytrack_transaksi");
      }

      const hasil = JSON.parse(data || "[]");

      if (!Array.isArray(hasil)) return [];

      return hasil
        .filter(item => item && typeof item === "object")
        .map((item, index) => ({
          id: String(item.id || ("transaksi-" + index)),
          keterangan: String(item.keterangan || "Transaksi"),
          nominal: Number(item.nominal),
          jenis: item.jenis,
          tanggal: String(item.tanggal || "-")
        }))
        .filter(item =>
          Number.isSafeInteger(item.nominal) &&
          item.nominal > 0 &&
          JENIS.includes(item.jenis)
        );

    } catch (error) {
      console.error("Gagal membaca transaksi:", error);
      return [];
    }
  }

  let transaksi = bacaTransaksi();

  function simpanTransaksi(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Gagal menyimpan transaksi:", error);
      alert("Data gagal disimpan. Periksa penyimpanan browser.");
      return false;
    }
  }

  // ==========================================
  // 4. MEMBACA JENIS TRANSAKSI
  // ==========================================

  function bacaJenis() {
    if (!jenisInput) return "";

    const option =
      jenisInput.options[jenisInput.selectedIndex];

    const nilai = String(jenisInput.value || "").toLowerCase();

    const teks = option
      ? String(option.textContent || "").toLowerCase()
      : "";

    const gabungan = nilai + " " + teks;

    if (/tabungan|tabung|saving/.test(gabungan)) {
      return "tabungan";
    }

    if (/pemasukan|pendapatan|masuk|income/.test(gabungan)) {
      return "pemasukan";
    }

    if (/pengeluaran|belanja|keluar|expense/.test(gabungan)) {
      return "pengeluaran";
    }

    return "";
  }

  // ==========================================
  // 5. MENGHITUNG SALDO DAN STATISTIK
  // ==========================================

  function hitungKeuangan() {
    let totalMasuk = 0;
    let totalKeluar = 0;
    let totalTabungan = 0;

    transaksi.forEach(function (item) {
      if (item.jenis === "pemasukan") {
        totalMasuk += item.nominal;
      }

      if (item.jenis === "pengeluaran") {
        totalKeluar += item.nominal;
      }

      if (item.jenis === "tabungan") {
        totalTabungan += item.nominal;
      }
    });

    // Tabungan dipisah: tidak dihitung sebagai pengeluaran, tapi mengurangi saldo tersedia
    const saldo = totalMasuk - totalKeluar - totalTabungan;

    // Kartu dashboard
    if (saldoElement) {
      saldoElement.textContent = rupiah(saldo);
    }

    if (pemasukanElement) {
      pemasukanElement.textContent = rupiah(totalMasuk);
    }

    if (pengeluaranElement) {
      pengeluaranElement.textContent = rupiah(totalKeluar);
    }

    if (tabunganElement) tabunganElement.textContent = rupiah(totalTabungan);
    if (tabunganLabel) tabunganLabel.textContent = rupiah(totalTabungan);

    tampilkanTarget(totalTabungan);

    // Dukungan kartu dashboard tanpa ID
    const kartu = document.querySelectorAll(".cards .card h2");

    if (!saldoElement && kartu[0]) {
      kartu[0].textContent = rupiah(saldo);
    }

    if (!pemasukanElement && kartu[1]) {
      kartu[1].textContent = rupiah(totalMasuk);
    }

    if (!pengeluaranElement && kartu[2]) {
      kartu[2].textContent = rupiah(totalKeluar);
    }

    // Label grafik
    if (masukLabel) {
      masukLabel.textContent = rupiah(totalMasuk);
    }

    if (keluarLabel) {
      keluarLabel.textContent = rupiah(totalKeluar);
    }

    // Batang grafik
    const terbesar = Math.max(totalMasuk, totalKeluar, totalTabungan);

    if (tabunganBar) {
      tabunganBar.style.width =
        terbesar > 0 ? (totalTabungan / terbesar * 100) + "%" : "0%";
    }

    if (masukBar) {
      masukBar.style.width =
        terbesar > 0
          ? (totalMasuk / terbesar * 100) + "%"
          : "0%";
    }

    if (keluarBar) {
      keluarBar.style.width =
        terbesar > 0
          ? (totalKeluar / terbesar * 100) + "%"
          : "0%";
    }
  }

  // ==========================================
  // 6. MENAMPILKAN RIWAYAT TRANSAKSI
  // ==========================================

  function tampilkanTransaksi() {
    if (!daftar) return;

    daftar.replaceChildren();

    if (transaksi.length === 0) {
      const kosong = document.createElement("p");
      kosong.textContent = "Belum ada transaksi.";
      daftar.appendChild(kosong);
      return;
    }

    const tampil = transaksi.filter(function (item) {
      return filterAktif === "semua" || item.jenis === filterAktif;
    });

    if (tampil.length === 0) {
      const kosong = document.createElement("p");
      kosong.textContent = "Belum ada transaksi di kategori ini.";
      daftar.appendChild(kosong);
      return;
    }

    [...tampil].reverse().forEach(function (item) {
      const baris = document.createElement("div");
      baris.className = "transaction-item " + item.jenis;

      const informasi = document.createElement("div");

      const badge = document.createElement("span");
      badge.className = "badge " + item.jenis;
      badge.textContent = LABEL[item.jenis];

      const nama = document.createElement("strong");
      nama.textContent = item.keterangan;

      const tanggal = document.createElement("small");
      tanggal.textContent = item.tanggal;

      informasi.append(badge, nama, tanggal);

      const aksi = document.createElement("div");

      const nominal = document.createElement("strong");

      const tanda =
        item.jenis === "pemasukan" ? "+ " : item.jenis === "tabungan" ? "→ " : "- ";

      nominal.textContent = tanda + rupiah(item.nominal);

      nominal.style.color =
        { pemasukan: "#22c55e", pengeluaran: "#fb7185", tabungan: "#facc15" }[item.jenis];

      const tombolHapus = document.createElement("button");
      tombolHapus.type = "button";
      tombolHapus.textContent = "Hapus";

      tombolHapus.addEventListener("click", function () {
        hapusTransaksi(item.id);
      });

      aksi.append(nominal, tombolHapus);
      baris.append(informasi, aksi);

      daftar.appendChild(baris);
    });
  }

  // ==========================================
  // 7. TAMBAH TRANSAKSI
  // ==========================================

  if (form) {
    form.addEventListener("submit", function (event) {

      event.preventDefault();

      const keterangan = keteranganInput
        ? keteranganInput.value.trim()
        : "";

      const nominal = nominalInput
        ? Number(nominalInput.value)
        : 0;

      const jenis = bacaJenis();

      if (!keterangan) {
        alert("Masukkan keterangan transaksi!");
        if (keteranganInput) keteranganInput.focus();
        return;
      }

      if (
        !Number.isSafeInteger(nominal) ||
        nominal <= 0
      ) {
        alert("Masukkan nominal yang benar!");
        if (nominalInput) nominalInput.focus();
        return;
      }

      if (!jenis) {
        alert("Pilih jenis: Pemasukan, Pengeluaran, atau Tabungan!");
        if (jenisInput) jenisInput.focus();
        return;
      }

      const dataBaru = {
        id: Date.now().toString() +
            Math.random().toString(36).slice(2),

        keterangan: keterangan,
        nominal: nominal,
        jenis: jenis,

        tanggal: new Date().toLocaleString("id-ID")
      };

      const dataSebelumnya = transaksi;

      transaksi = [...transaksi, dataBaru];

      if (!simpanTransaksi(transaksi)) {
        transaksi = dataSebelumnya;
        return;
      }

      form.reset();

      hitungKeuangan();
      tampilkanTransaksi();

      alert("Transaksi berhasil disimpan!");
    });

  } else {
    console.error("Form transaksi tidak ditemukan!");
  }

  // ==========================================
  // 8. HAPUS TRANSAKSI
  // ==========================================

  function hapusTransaksi(id) {

    const yakin = confirm(
      "Yakin ingin menghapus transaksi ini?"
    );

    if (!yakin) return;

    const dataSebelumnya = transaksi;

    transaksi = transaksi.filter(function (item) {
      return item.id !== id;
    });

    if (!simpanTransaksi(transaksi)) {
      transaksi = dataSebelumnya;
      return;
    }

    hitungKeuangan();
    tampilkanTransaksi();
  }

  // ==========================================
  // 9. TANGGAL OTOMATIS
  // ==========================================

  function perbaruiTanggal() {
    if (!tanggalElement) return;

    tanggalElement.textContent =
      new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
  }

  // ==========================================
  // 10. FOTO PROFIL DEVELOPER
  // ==========================================

  function muatFotoProfil() {
    if (!fotoProfil) return;

    try {
      const foto = localStorage.getItem(PHOTO_KEY);

      if (foto) {
        fotoProfil.src = foto;
        if (fotoUtama) fotoUtama.src = foto;
      }
    } catch (error) {
      console.error("Gagal memuat foto:", error);
    }
  }

  if (uploadFoto && fotoProfil) {

    uploadFoto.addEventListener("change", function () {

      const file = uploadFoto.files
        ? uploadFoto.files[0]
        : null;

      if (!file) return;

      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        alert("Gunakan foto JPG, PNG, atau WEBP.");
        uploadFoto.value = "";
        return;
      }

      if (file.size > 1024 * 1024) {
        alert("Ukuran foto maksimal 1 MB.");
        uploadFoto.value = "";
        return;
      }

      const reader = new FileReader();

      reader.onload = function (event) {

        const fotoBaru = event.target.result;

        try {
          localStorage.setItem(PHOTO_KEY, fotoBaru);
          fotoProfil.src = fotoBaru;
          if (fotoUtama) fotoUtama.src = fotoBaru;

          alert("Foto profil berhasil diganti!");

        } catch (error) {
          console.error("Gagal menyimpan foto:", error);
          alert("Foto gagal disimpan. Coba gambar yang lebih kecil.");
        }
      };

      reader.onerror = function () {
        alert("Gagal membaca file foto.");
      };

      reader.readAsDataURL(file);
    });
  }

  const tombolFoto = document.getElementById("tombolGantiFoto");
  if (tombolFoto && uploadFoto) {
    tombolFoto.addEventListener("click", function () { uploadFoto.click(); });
  }

  // ==========================================
  // 10b. FILTER RIWAYAT, TARGET TABUNGAN, NAVIGASI
  // ==========================================

  if (filterJenis) {
    filterJenis.addEventListener("change", function () {
      filterAktif = filterJenis.value;
      tampilkanTransaksi();
    });
  }

  function bacaTarget() {
    try {
      const t = Number(localStorage.getItem(TARGET_KEY));
      return Number.isSafeInteger(t) && t > 0 ? t : 0;
    } catch (e) { return 0; }
  }

  function tampilkanTarget(totalTabungan) {
    if (!targetInfo || !targetBar) return;
    const target = bacaTarget();
    if (!target) {
      targetInfo.textContent = "Belum ada target. Terkumpul: " + rupiah(totalTabungan);
      targetBar.style.width = "0%";
      return;
    }
    const persen = Math.min(100, Math.round(totalTabungan / target * 100));
    targetInfo.textContent = rupiah(totalTabungan) + " dari " + rupiah(target) + " (" + persen + "%)";
    targetBar.style.width = persen + "%";
  }

  if (tombolTarget && targetInput) {
    tombolTarget.addEventListener("click", function () {
      const t = Number(targetInput.value);
      if (!Number.isSafeInteger(t) || t <= 0) {
        alert("Masukkan target yang benar!");
        return;
      }
      try {
        localStorage.setItem(TARGET_KEY, String(t));
      } catch (e) {
        alert("Target gagal disimpan.");
        return;
      }
      targetInput.value = "";
      hitungKeuangan();
    });
  }

  // Navigasi antar halaman (geser kiri-kanan / klik menu)
  const pages = document.getElementById("pages");
  const menu = document.querySelectorAll(".sidebar a, .bottom-nav a");
  const urutan = ["home", "transaksi", "statistik", "profil"];

  function aktifkanMenu(id) {
    menu.forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === "#" + id);
    });
  }

  menu.forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      const tujuan = document.querySelector(a.getAttribute("href"));
      if (tujuan && pages) pages.scrollTo({ left: tujuan.offsetLeft, behavior: "smooth" });
    });
  });

  if (pages) {
    pages.addEventListener("scroll", function () {
      const i = Math.round(pages.scrollLeft / pages.clientWidth);
      aktifkanMenu(urutan[i] || "home");
    });
  }

  // ==========================================
  // 11. MENJALANKAN DASHBOARD
  // ==========================================

  function mulaiMoneyTrack() {
    hitungKeuangan();
    tampilkanTransaksi();
    perbaruiTanggal();
    muatFotoProfil();
  }

  mulaiMoneyTrack();

  // Perbarui tanggal setiap menit
  setInterval(perbaruiTanggal, 60000);

  console.log("MONEYTRACK berhasil dijalankan!");

});
/* MONEYTRACK - Member & Login (versi lokal, tersimpan di browser) */
(function () {
  "use strict";

  const USERS_KEY = "moneytrack_members";
  const SESSION_KEY = "moneytrack_session";

  function bacaMember() {
    try {
      const d = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
      return Array.isArray(d) ? d : [];
    } catch (e) { return []; }
  }
  function simpanMember(d) { localStorage.setItem(USERS_KEY, JSON.stringify(d)); }

  const bytes = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  const acak = () => bytes(crypto.getRandomValues(new Uint8Array(16)));

  async function hashSandi(sandi, salt) {
    const kunci = await crypto.subtle.importKey("raw", new TextEncoder().encode(sandi), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations: 100000, hash: "SHA-256" }, kunci, 256);
    return bytes(bits);
  }

  // Sesi aktif -> dibaca sinkron supaya script.js tahu siapa yang login
  const sesi = localStorage.getItem(SESSION_KEY);
  window.MT_USER = bacaMember().find(m => m.id === sesi) || null;

  const $ = (id) => document.getElementById(id);
  const box = $("authBox");
  const pesan = $("authPesan");
  let mode = "masuk";

  function tampilPesan(t) { pesan.textContent = t || ""; }

  function ubahMode(m) {
    mode = m;
    $("authNama").hidden = m !== "daftar";
    $("authJudul").textContent = m === "daftar" ? "Daftar Member" : "Masuk";
    $("authKirim").textContent = m === "daftar" ? "Daftar" : "Masuk";
    $("authGanti").textContent = m === "daftar" ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar";
    tampilPesan("");
  }

  if (!window.MT_USER) {
    box.hidden = false;
    if (!(window.crypto && crypto.subtle)) {
      tampilPesan("Browser/alamat ini tidak mendukung enkripsi (butuh HTTPS). Buka lewat https atau localhost.");
      $("authKirim").disabled = true;
    }
    $("authGanti").addEventListener("click", () => ubahMode(mode === "masuk" ? "daftar" : "masuk"));

    $("authForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      const username = $("authUser").value.trim().toLowerCase();
      const sandi = $("authSandi").value;
      const daftar = bacaMember();

      if (!/^[a-z0-9_]{3,20}$/.test(username)) return tampilPesan("Username 3-20 karakter: huruf kecil, angka, atau _.");
      if (sandi.length < 6) return tampilPesan("Password minimal 6 karakter.");

      if (mode === "daftar") {
        const nama = $("authNama").value.trim().slice(0, 40);
        if (!nama) return tampilPesan("Isi nama lengkap.");
        if (daftar.some(m => m.username === username)) return tampilPesan("Username sudah dipakai.");
        const salt = acak();
        const baru = {
          id: acak(), nama, username, salt,
          hash: await hashSandi(sandi, salt),
          // akun pertama otomatis jadi developer
          role: daftar.length === 0 ? "developer" : "member",
          dibuat: new Date().toISOString()
        };
        daftar.push(baru);
        try { simpanMember(daftar); } catch (err) { return tampilPesan("Gagal menyimpan akun."); }
        localStorage.setItem(SESSION_KEY, baru.id);
        location.reload();
      } else {
        const m = daftar.find(x => x.username === username);
        if (!m || (await hashSandi(sandi, m.salt)) !== m.hash) return tampilPesan("Username atau password salah.");
        localStorage.setItem(SESSION_KEY, m.id);
        location.reload();
      }
    });
    return;
  }

  // ===== Sudah login =====
  const u = window.MT_USER;
  const nm = document.querySelector(".user-profile b");
  const rl = document.querySelector(".user-profile small");
  if (nm) nm.textContent = u.nama;
  if (rl) rl.textContent = u.role === "developer" ? "Developer" : "Member";
  const info = $("infoMember");
  if (info) info.textContent = u.nama + " (@" + u.username + ") - " + (u.role === "developer" ? "Developer" : "Member");

  $("tombolKeluar").addEventListener("click", function () {
    localStorage.removeItem(SESSION_KEY);
    location.reload();
  });

  if (u.role === "developer") {
    $("panelAdmin").hidden = false;
    const daftar = bacaMember();
    $("jumlahMember").textContent = "Total member terdaftar: " + daftar.length;

    // Cegah formula injection saat CSV dibuka di Excel
    const sel = (v) => {
      let s = String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };

    $("tombolUnduhMember").addEventListener("click", function () {
      const baris = [["No", "Nama", "Username", "Peran", "Tanggal Daftar"]];
      bacaMember().forEach((m, i) => baris.push([i + 1, m.nama, m.username, m.role, new Date(m.dibuat).toLocaleString("id-ID")]));
      const csv = "\uFEFF" + baris.map(r => r.map(sel).join(",")).join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "daftar-member-moneytrack.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }
})();
