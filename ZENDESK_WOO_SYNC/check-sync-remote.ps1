$AdminSecret = "3f9AqL8mZx7V2D4RkWnJcYB6H5PpM0TQ"
$ApiUrl = "https://kr-zendesk-woo-sync.vercel.app/api/export-recent"

Write-Host "Checking remote sync status via API..." -ForegroundColor Cyan
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

try {
    $response = Invoke-WebRequest -Uri $ApiUrl -Method Get -Headers @{ "X-Admin-Secret" = $AdminSecret } -UseBasicParsing
    
    if ($response.StatusCode -eq 200) {
        $content = $response.Content
        $lines = $content -split "`n"
        # Header is line 0, data starts at line 1
        $dataLines = $lines | Select-Object -Skip 1 | Where-Object { $_.Trim() -ne "" }
        $count = $dataLines.Count
        
        Write-Host "Success! API is reachable." -ForegroundColor Green
        Write-Host "Records synced in last 24 hours: $count" -ForegroundColor Yellow
        
        if ($count -gt 0) {
            Write-Host "Sample (first 3 records):"
            $dataLines | Select-Object -First 3 | ForEach-Object { Write-Host "  $_" }
        } else {
            Write-Host "No records updated in the last 24 hours."
        }
    } else {
        Write-Host "API returned status code: $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "Error connecting to API: $($_.Exception.Message)" -ForegroundColor Red
}
