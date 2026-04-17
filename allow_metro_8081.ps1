# allow_metro_8081.ps1
# Run this script as Administrator. If not elevated it will re-launch itself as admin.

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Elevation required. Relaunching as Administrator..."
    Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File \"$PSCommandPath\"" -Verb RunAs
    exit
}

try {
    # Check if a rule with the same name already exists
    $existing = Get-NetFirewallRule -DisplayName "Allow Metro 8081" -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "Firewall rule 'Allow Metro 8081' already exists. Updating to allow TCP 8081 inbound..."
        Remove-NetFirewallRule -DisplayName "Allow Metro 8081" -ErrorAction SilentlyContinue
    }

    New-NetFirewallRule -DisplayName "Allow Metro 8081" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow -Profile Any -ErrorAction Stop
    Write-Host "Firewall rule added: Allow Metro 8081 (TCP inbound)."
} catch {
    Write-Error "Failed to add firewall rule: $_"
}

Write-Host "Done. You can now retry scanning the QR in Expo Go (set Host → LAN → Reload)."
