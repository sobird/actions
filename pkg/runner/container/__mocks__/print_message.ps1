$message = "Hello, World!"

for ($i = 1; $i -le 5; $i++) {
    Write-Host "$message $i"
    Start-Sleep -Milliseconds 500
}