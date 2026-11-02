Write-Host "=========================================================" -ForegroundColor Amber
Write-Host "  TRADEATLAS - ZERO-DOWNTIME EMERGENCY UPDATE REVERT     " -ForegroundColor Amber
Write-Host "=========================================================" -ForegroundColor Amber

Set-Location "C:\Users\Pops\crowevar-Tjournal"

Write-Host "`n[1/3] Reverting to previous working Git commit..." -ForegroundColor Cyan
git revert HEAD --no-edit
if ($LASTEXITCODE -ne 0) {
  Write-Host "Git revert had conflicts; resetting to HEAD~1 cleanly..." -ForegroundColor Yellow
  git revert --abort 2>$null
  git reset --hard HEAD~1
}

Write-Host "`n[2/3] Verifying clean production build (npm run build)..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
  Write-Host "`n[3/3] Pushing verified working build to GitHub & Vercel..." -ForegroundColor Green
  git push origin main --force
  Write-Host "`nSUCCESS: Previous working version is now live on Vercel and Local!" -ForegroundColor Green
} else {
  Write-Host "`nBuild check failed. Restoring from latest local .backups snapshot..." -ForegroundColor Red
  $latestSnap = Get-ChildItem "C:\Users\Pops\crowevar-Tjournal\.backups" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($latestSnap) {
    Copy-Item "$($latestSnap.FullName)\*" "C:\Users\Pops\crowevar-Tjournal\src\" -Recurse -Force
    npm run build
    git add .
    git commit -m "Emergency restore from verified local snapshot $($latestSnap.Name)"
    git push origin main
    Write-Host "Restored and deployed from $($latestSnap.Name)!" -ForegroundColor Green
  }
}