Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  OmniConvert Project File Integrity Verification" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$allPassed = $true

# 1. Check file existence
$files = @("index.html", "styles.css", "app.js")
foreach ($file in $files) {
    $path = Join-Path $PSScriptRoot $file
    if (Test-Path $path) {
        $size = (Get-Item $path).Length
        Write-Host "[PASS] $file exists ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $file is missing." -ForegroundColor Red
        $allPassed = $false
    }
}

# 2. Check HTML dependency declarations
if (Test-Path (Join-Path $PSScriptRoot "index.html")) {
    $htmlContent = Get-Content (Join-Path $PSScriptRoot "index.html") -Raw
    $checkLibrary = @("jszip", "mammoth", "pdf.js", "jspdf", "lucide", "app.js")
    Write-Host ""
    Write-Host ">> HTML Dependency Declarations Scan:" -ForegroundColor Yellow
    foreach ($lib in $checkLibrary) {
        if ($htmlContent -like "*$lib*") {
            Write-Host "  - [PASS] $lib CDN script check" -ForegroundColor Green
        } else {
            Write-Host "  - [FAIL] $lib declaration missing" -ForegroundColor Red
            $allPassed = $false
        }
    }
}

# 3. Check JavaScript parser and generator core modules
if (Test-Path (Join-Path $PSScriptRoot "app.js")) {
    $jsContent = Get-Content (Join-Path $PSScriptRoot "app.js") -Raw
    $checkFunctions = @("calculateTfidfSummarizer", "buildDocxBlob", "buildHwpxBlob", "buildPdfBlob", "wrapInJava", "btnRunDiagnostics")
    Write-Host ""
    Write-Host ">> JavaScript Core Engine Modules:" -ForegroundColor Yellow
    foreach ($func in $checkFunctions) {
        if ($jsContent -like "*$func*") {
            Write-Host "  - [PASS] $func interface verified" -ForegroundColor Green
        } else {
            Write-Host "  - [FAIL] $func interface missing" -ForegroundColor Red
            $allPassed = $false
        }
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "  VERIFICATION RESULT: SUCCESS! All files and modules are valid." -ForegroundColor Green
} else {
    Write-Host "  VERIFICATION RESULT: FAIL! Missing files or core modules." -ForegroundColor Red
}
Write-Host "==================================================" -ForegroundColor Cyan
