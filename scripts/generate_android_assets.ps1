Add-Type -AssemblyName System.Drawing

$projectRoot = "c:\Program Files\Full-Stack Path\Frontend\Projects\tallyo-count-main"
$iconPath = Join-Path $projectRoot "public\icon-512.png"
$resDir = Join-Path $projectRoot "android\app\src\main\res"

if (-not (Test-Path $iconPath)) {
    Write-Error "Source icon not found at $iconPath"
    exit 1
}

$sourceIcon = [System.Drawing.Bitmap]::FromFile($iconPath)
$bgColor = [System.Drawing.Color]::FromArgb(255, 11, 13, 20) # #0b0d14

function Create-SplashScreen($width, $height, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $brush = New-Object System.Drawing.SolidBrush($bgColor)
    $g.FillRectangle($brush, 0, 0, $width, $height)
    $brush.Dispose()

    # Scale icon to ~35% of the smaller dimension, but at least 96px and at most 380px
    $minDim = [Math]::Min($width, $height)
    $logoSize = [Math]::Max(96, [Math]::Min(380, [int]($minDim * 0.38)))
    
    $x = [int](($width - $logoSize) / 2)
    $y = [int](($height - $logoSize) / 2)
    
    $destRect = New-Object System.Drawing.Rectangle($x, $y, $logoSize, $logoSize)
    $g.DrawImage($sourceIcon, $destRect, 0, 0, $sourceIcon.Width, $sourceIcon.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    $dir = Split-Path $outputPath -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated splash: $outputPath ($width x $height, logo $logoSize)"
}

function Create-LauncherIcon($size, $outputPath, $isRound = $false) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($isRound) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddEllipse(0, 0, $size, $size)
        $g.SetClip($path)
    }

    $destRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $g.DrawImage($sourceIcon, $destRect, 0, 0, $sourceIcon.Width, $sourceIcon.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    $dir = Split-Path $outputPath -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated icon: $outputPath ($size x $size)"
}

function Create-ForegroundIcon($size, $outputPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    # In adaptive icons, safe central area is ~66% of the 108dp viewport
    $logoSize = [int]($size * 0.65)
    $x = [int](($size - $logoSize) / 2)
    $y = [int](($size - $logoSize) / 2)

    $destRect = New-Object System.Drawing.Rectangle($x, $y, $logoSize, $logoSize)
    $g.DrawImage($sourceIcon, $destRect, 0, 0, $sourceIcon.Width, $sourceIcon.Height, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    $dir = Split-Path $outputPath -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated foreground icon: $outputPath ($size x $size)"
}

# 1. Splash screens
$splashes = @(
    @{ Path = "drawable\splash.png"; W = 480; H = 800 },
    @{ Path = "drawable-port-mdpi\splash.png"; W = 320; H = 480 },
    @{ Path = "drawable-port-hdpi\splash.png"; W = 480; H = 800 },
    @{ Path = "drawable-port-xhdpi\splash.png"; W = 720; H = 1280 },
    @{ Path = "drawable-port-xxhdpi\splash.png"; W = 960; H = 1600 },
    @{ Path = "drawable-port-xxxhdpi\splash.png"; W = 1280; H = 1920 },
    @{ Path = "drawable-land-mdpi\splash.png"; W = 480; H = 320 },
    @{ Path = "drawable-land-hdpi\splash.png"; W = 800; H = 480 },
    @{ Path = "drawable-land-xhdpi\splash.png"; W = 1280; H = 720 },
    @{ Path = "drawable-land-xxhdpi\splash.png"; W = 1600; H = 960 },
    @{ Path = "drawable-land-xxxhdpi\splash.png"; W = 1920; H = 1280 }
)

foreach ($s in $splashes) {
    Create-SplashScreen -width $s.W -height $s.H -outputPath (Join-Path $resDir $s.Path)
}

# 2. Launcher icons
$densities = @(
    @{ Name = "mdpi"; Size = 48; Fg = 108 },
    @{ Name = "hdpi"; Size = 72; Fg = 162 },
    @{ Name = "xhdpi"; Size = 96; Fg = 216 },
    @{ Name = "xxhdpi"; Size = 144; Fg = 324 },
    @{ Name = "xxxhdpi"; Size = 192; Fg = 432 }
)

foreach ($d in $densities) {
    $dirName = "mipmap-$($d.Name)"
    Create-LauncherIcon -size $d.Size -outputPath (Join-Path $resDir "$dirName\ic_launcher.png")
    Create-LauncherIcon -size $d.Size -outputPath (Join-Path $resDir "$dirName\ic_launcher_round.png") -isRound $true
    Create-ForegroundIcon -size $d.Fg -outputPath (Join-Path $resDir "$dirName\ic_launcher_foreground.png")
}

$sourceIcon.Dispose()
Write-Host "All assets generated successfully!"
