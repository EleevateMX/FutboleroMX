param(
  [int]$Port = 5599,
  [string]$Root = "."
)

# ── Servidor estático sin dependencias (Node/Python no están instalados) ──────
# Sirve la carpeta del proyecto con MIME types correctos y sin caché, para que
# la vista previa siempre muestre el CSS/JS más reciente.

$ErrorActionPreference = "Stop"
$rootPath = (Resolve-Path $Root).Path
Write-Host "TVContigo static server -> http://localhost:$Port  (root: $rootPath)"

$mime = @{
  ".html" = "text/html; charset=utf-8";
  ".htm"  = "text/html; charset=utf-8";
  ".css"  = "text/css; charset=utf-8";
  ".js"   = "application/javascript; charset=utf-8";
  ".mjs"  = "application/javascript; charset=utf-8";
  ".json" = "application/json; charset=utf-8";
  ".svg"  = "image/svg+xml";
  ".png"  = "image/png";
  ".jpg"  = "image/jpeg";
  ".jpeg" = "image/jpeg";
  ".gif"  = "image/gif";
  ".webp" = "image/webp";
  ".ico"  = "image/x-icon";
  ".woff" = "font/woff";
  ".woff2"= "font/woff2";
  ".ttf"  = "font/ttf";
  ".map"  = "application/json; charset=utf-8";
  ".webmanifest" = "application/manifest+json; charset=utf-8";
  ".txt"  = "text/plain; charset=utf-8";
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()

try {
  while ($listener.IsListening) {
    $context  = $listener.GetContext()
    $request  = $context.Request
    $response = $context.Response
    try {
      $urlPath = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath)
      if ($urlPath -eq "/" -or $urlPath -eq "") { $urlPath = "/index.html" }
      $rel = $urlPath.TrimStart("/").Replace("/", "\")
      $full = Join-Path $rootPath $rel

      # Si es un directorio, busca index.html dentro
      if ((Test-Path $full) -and (Get-Item $full).PSIsContainer) {
        $full = Join-Path $full "index.html"
      }

      # Anti directory-traversal: el archivo debe vivir bajo la raíz
      $resolved = $null
      if (Test-Path $full) { $resolved = (Resolve-Path $full).Path }

      if ($resolved -and $resolved.StartsWith($rootPath) -and -not (Get-Item $resolved).PSIsContainer) {
        $ext = [System.IO.Path]::GetExtension($resolved).ToLower()
        $ct = $mime[$ext]; if (-not $ct) { $ct = "application/octet-stream" }
        $bytes = [System.IO.File]::ReadAllBytes($resolved)
        $response.StatusCode = 200
        $response.ContentType = $ct
        $response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
        $response.StatusCode = 404
        $response.ContentType = "text/plain; charset=utf-8"
        $response.ContentLength64 = $msg.Length
        $response.OutputStream.Write($msg, 0, $msg.Length)
      }
    } catch {
      try {
        $err = [System.Text.Encoding]::UTF8.GetBytes("500 Server Error: $($_.Exception.Message)")
        $response.StatusCode = 500
        $response.ContentLength64 = $err.Length
        $response.OutputStream.Write($err, 0, $err.Length)
      } catch {}
    } finally {
      $response.OutputStream.Close()
    }
  }
} finally {
  $listener.Stop()
}
