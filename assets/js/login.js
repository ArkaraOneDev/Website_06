/**
 * Script untuk menangani proses login menggunakan Supabase sebagai database utama.
 * Menggantikan sistem verifikasi Google Apps Script sebelumnya.
 * Update: Menggunakan sessionStorage untuk keamanan sesi.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- KONFIGURASI SUPABASE ---
    const SUPABASE_URL = 'https://dqfithvufqewtchicrgw.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_wp6piNTxSLOXT-ezmfnhaQ_cFKP13k7';
    
    // Inisialisasi client Supabase
    const _supabase = typeof supabase !== 'undefined' ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

    // --- ELEMEN UI ---
    const loginForm = document.getElementById('loginForm');
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const statusMessage = document.getElementById('statusMessage');

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usernameInput = document.getElementById('username').value.trim();
        const passwordInput = document.getElementById('password').value.trim();

        // 1. Validasi Input
        if (!usernameInput || !passwordInput) {
            displayStatus("Username dan Password tidak boleh kosong.", "text-red-600");
            return;
        }

        if (!_supabase) {
            displayStatus("Koneksi database gagal. Periksa library Supabase.", "text-red-600");
            return;
        }

        setLoading(true);

        try {
            // 2. Verifikasi Kredensial Langsung ke Tabel 'users'
            const { data: userData, error: authError } = await _supabase
                .from('users') 
                .select('username, password, authority')
                .eq('username', usernameInput)
                .eq('password', passwordInput)
                .single(); 

            // Jika error atau data tidak ditemukan
            if (authError || !userData) {
                console.error('Auth Error:', authError);
                displayStatus("Username atau Password salah!", "text-red-600");
                setLoading(false);
                return;
            }

            // 3. Persiapan Data Sesi & Log
            const now = new Date();
            const formattedDateTime = formatWIB(now);
            const userAuthority = userData.authority || "Level 1";

            const loginLogData = {
                username: userData.username,
                authority: userAuthority, 
                login: formattedDateTime,
                logout: "-",
                time: "00 h 00 min 00 sec"
            };

            // 4. Update Log Aktivitas ke Tabel 'logins'
            const { error: upsertError } = await _supabase
                .from('logins')
                .upsert(loginLogData);

            if (upsertError) {
                console.warn('Gagal mencatat log aktivitas:', upsertError.message);
            }

            // 5. Simpan Sesi ke sessionStorage (Perubahan di sini)
            // sessionStorage.setItem akan menghapus data saat tab ditutup
            sessionStorage.setItem('sessionUser', JSON.stringify({
                ...loginLogData,
                loginTimestamp: now.getTime()
            }));

            displayStatus(`Login sebagai ${userAuthority} berhasil!`, "text-green-600");
            
            // Redirect ke halaman utama
            setTimeout(() => {
                window.location.href = 'landing.html';
            }, 1000);

        } catch (error) {
            console.error('System Error:', error);
            displayStatus("Terjadi kesalahan sistem. Silakan coba lagi.", "text-red-600");
            setLoading(false);
        }
    });

    /**
     * Helper: Format Waktu Indonesia (dd/mm/yy hh:mm)
     */
    function formatWIB(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    /**
     * Mengatur state loading pada tombol
     */
    function setLoading(isLoading) {
        if (!submitBtn) return;
        submitBtn.disabled = isLoading;
        if (btnText) btnText.innerText = isLoading ? "Memverifikasi..." : "Masuk";
        submitBtn.classList.toggle('opacity-70', isLoading);
        submitBtn.classList.toggle('cursor-not-allowed', isLoading);
    }

    /**
     * Menampilkan pesan status di UI
     */
    function displayStatus(message, colorClass) {
        if (statusMessage) {
            statusMessage.innerText = message;
            statusMessage.className = `mt-4 text-center text-sm font-medium ${colorClass}`;
        }
    }
});