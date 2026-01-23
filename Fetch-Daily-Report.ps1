# ========================================================
# Fetch Daily Sync Report
# ========================================================
# This script downloads a CSV report of all subscriptions updated 
# in the last 24 hours and saves it to your Downloads folder.
#
# USAGE:
# 1. Open PowerShell
# 2. Run: .\Fetch-Daily-Report.ps1

$AdminSecret = "3f9AqL8mZx7V2D4RkWnJcYB6H5PpM0TQ"
$ApiUrl = "https://kr-zendesk-woo-sync.vercel.app/api/export-recent"

# Define Output Path (Downloads Folder)
$DownloadsPath = [System.Environment]::GetFolderPath("MyDocuments") -replace "Documents", "Downloads"
$DateStr = Get-Date -Format "yyyy-MM-dd"
$OutputFile = "$DownloadsPath\KR_Sync_Report_$DateStr.csv"

Write-Host "Fetching daily report from server..." -ForegroundColor Cyan

try {
    # Call the API
    Invoke-RestMethod -Uri $ApiUrl `
        -Method Get `
        -Headers @{ "X-Admin-Secret" = $AdminSecret } `
        -OutFile $OutputFile

    # Check if file exists and has content
    if ((Get-Item $OutputFile).Length -gt 0) {
        Write-Host "Success! Report saved to:" -ForegroundColor Green
        Write-Host $OutputFile -ForegroundColor Yellow
    } else {
        Write-Host "Warning: The downloaded file is empty. Maybe no updates in last 24h?" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error fetching report: $($_.Exception.Message)" -ForegroundColor Red
}
