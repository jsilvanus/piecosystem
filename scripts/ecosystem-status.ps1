# PowerShell wrapper to inspect all Pi Ecosystem projects
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
node (Join-Path $scriptPath "ecosystem-status.mjs")
