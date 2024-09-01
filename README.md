# 🕵️ Bypassing HitmanPro.Alert Credential Theft Protection

## How infostealers work

Infostealers targeting Chromium-based browsers tend to be pretty straight forward, they most commonly (but not only) target cookies and saved logins on the browser. The flow is mainly:

1. **Locate** and access the `Local State` file to find the browser's master key.
2. **Decrypt** the master key using the **Windows Data Protection** API.
3. **Extract** cookies and login information from their SQLite database files (`Cookies` and `Login Data`).
4. **Decrypt** the extracted data using the master key.

