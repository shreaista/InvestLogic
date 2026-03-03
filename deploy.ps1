param(
  [string]$Msg = "deploy",
  [string]$RG  = "rg-ipa-fresh",
  [string]$APP = "ipa-fresh-frontend",
  [string]$ACR = "ipafreshacr1072",
  [string]$IMAGE = "ipa-fresh-frontend"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Deploy starting ==="

# 0) Ensure we're in the repo root where Dockerfile exists
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path)

# 1) Git commit + push (only if there are changes)
git status --porcelain | Out-String | ForEach-Object {
  if ([string]::IsNullOrWhiteSpace($_)) {
    Write-Host "No git changes to commit."
  } else {
    git add -A
    git commit -m $Msg
    git push
  }
}

# 2) Build + push image to ACR with unique tag
$TAG = Get-Date -Format "yyyyMMddHHmmss"
$FULL_IMAGE = "$ACR.azurecr.io/$IMAGE`:$TAG"

Write-Host "Building image: $FULL_IMAGE"
az acr build -r $ACR -t $FULL_IMAGE .

# 3) Update Container App to new image
Write-Host "Updating Container App: $APP"
az containerapp update --name $APP --resource-group $RG --image $FULL_IMAGE | Out-Null

# 4) Show URL + image running
$FQDN = az containerapp show --name $APP --resource-group $RG --query "properties.configuration.ingress.fqdn" -o tsv
$RUNNING = az containerapp show --name $APP --resource-group $RG --query "properties.template.containers[0].image" -o tsv

Write-Host ""
Write-Host "=== DEPLOYED ==="
Write-Host "Running image: $RUNNING"
Write-Host "URL: https://$FQDN/login?ts=$TAG"
Write-Host ""
