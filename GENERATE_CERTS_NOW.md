# Generate Certificates NOW - Simple Steps

## The Error You're Seeing

```
Error: ENOENT: no such file or directory, open 'certs/cert.pem'
```

This means the certificate files don't exist yet. Let's fix it!

---

## 🚀 SOLUTION - Run These Commands

### Step 1: Check if mkcert is installed

Open PowerShell and run:

```powershell
mkcert -version
```

**If you see a version number** (like `v1.4.4`):
- ✅ Great! Skip to Step 3

**If you see "command not found"**:
- ❌ You need to install mkcert first (go to Step 2)

---

### Step 2: Install mkcert (Only if Step 1 failed)

**Option A - Using Chocolatey:**

Open PowerShell as Administrator:

```powershell
choco install mkcert -y
```

**Option B - Using winget:**

```powershell
winget install FiloSottile.mkcert
```

**Option C - Manual Download:**

1. Download: https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-windows-amd64.exe
2. Rename to: `mkcert.exe`
3. Move to: `C:\Windows\System32\`

After installing, close and reopen PowerShell.

---

### Step 3: Install Local CA

Open PowerShell as Administrator:

```powershell
mkcert -install
```

Expected output:
```
Created a new local CA 💥
The local CA is now installed in the system trust store! ⚡️
```

---

### Step 4: Navigate to Your Project

```powershell
cd C:\Users\hp\Desktop\QR-REASTURENT\pro\pro\QR-menu-org
```

---

### Step 5: Create certs Folder

```powershell
mkdir certs
```

---

### Step 6: Generate Certificates

```powershell
mkcert -key-file certs/key.pem -cert-file certs/cert.pem 10.208.179.58 localhost 127.0.0.1
```

Expected output:
```
Created a new certificate valid for the following names 📜
 - "10.208.179.58"
 - "localhost"
 - "127.0.0.1"

The certificate is at "certs/cert.pem" and the key at "certs/key.pem" ✅
```

---

### Step 7: Verify Files Created

```powershell
dir certs
```

You should see:
```
cert.pem
key.pem
```

---

### Step 8: Start Dev Server

```powershell
npm run dev
```

Expected output:
```
VITE v5.4.19  ready in 523 ms

➜  Local:   https://localhost:5174/QRMENU/
➜  Network: https://10.208.179.58:5174/QRMENU/
```

Notice the `https://` instead of `http://`!

---

## ✅ Success!

If you see `https://` in the terminal output, you're done with certificate generation!

Now you need to:

1. **Configure Firebase:**
   - Go to: https://console.firebase.google.com/project/qr-menu-19cd1/authentication/settings
   - Add domain: `10.208.179.58`

2. **Configure Clerk:**
   - Go to: https://dashboard.clerk.com/
   - Add origin: `https://10.208.179.58:5174`

3. **Open in browser:**
   - Navigate to: `https://10.208.179.58:5174/QRMENU/admin`
   - Accept certificate warning (click Advanced → Proceed)

---

## 🆘 Still Having Issues?

### Issue: "mkcert: command not found" after installing

**Solution:**
```powershell
# Close and reopen PowerShell
# Or manually add to PATH:
$env:Path += ";C:\ProgramData\chocolatey\bin"
```

### Issue: "Access denied" when running mkcert -install

**Solution:**
- Right-click PowerShell
- Select "Run as Administrator"
- Run `mkcert -install` again

### Issue: Certificates generated but still getting error

**Solution:**
```powershell
# Verify files exist
dir certs

# Restart dev server
# Press Ctrl+C to stop
npm run dev
```

---

## 🎯 Quick Copy-Paste (All Commands)

```powershell
# Install mkcert (choose one)
choco install mkcert -y
# OR
winget install FiloSottile.mkcert

# Install CA (as Administrator)
mkcert -install

# Navigate to project
cd C:\Users\hp\Desktop\QR-REASTURENT\pro\pro\QR-menu-org

# Create folder
mkdir certs

# Generate certificates
mkcert -key-file certs/key.pem -cert-file certs/cert.pem 10.208.179.58 localhost 127.0.0.1

# Verify
dir certs

# Start server
npm run dev
```

---

## 📞 Need More Help?

See the complete guide: **COMPLETE_HTTPS_FIX.md**
