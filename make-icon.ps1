param([string]$Out)

Add-Type -AssemblyName System.Drawing

# The app mark: one brilliant-cut stone, split down the middle — gold for VND on the left, mint for
# USD on the right. The earlier icon was a bare rhombus with a hard seam across it, which at tray
# size read as a flat lozenge; a real cut has a flat table, a crown that catches the light and a
# darker pavilion below the girdle, so the shape still says "gem" at 16 px.

function New-Frame([int]$s) {
    $bmp = New-Object System.Drawing.Bitmap($s, $s, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    function Pt([double]$x, [double]$y) {
        New-Object System.Drawing.PointF([float]($x * $s), [float]($y * $s))
    }

    $tableL  = Pt 0.335 0.235
    $tableM  = Pt 0.500 0.235
    $tableR  = Pt 0.665 0.235
    $girdleL = Pt 0.048 0.448
    $girdleM = Pt 0.500 0.448
    $girdleR = Pt 0.952 0.448
    $culet   = Pt 0.500 0.958

    $rect = New-Object System.Drawing.RectangleF(0, 0, $s, $s)
    function Grad([int[]]$top, [int[]]$bottom) {
        $a = [System.Drawing.Color]::FromArgb(255, $top[0], $top[1], $top[2])
        $b = [System.Drawing.Color]::FromArgb(255, $bottom[0], $bottom[1], $bottom[2])
        New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $a, $b, 90.0)
    }

    # Crown catches the light; pavilion falls away into shadow.
    $crownGold = Grad @(255, 226, 158) @(255, 176, 32)
    $crownMint = Grad @(150, 240, 208) @(53, 192, 142)
    $paveGold  = Grad @(240, 160, 16)  @(158, 88, 0)
    $paveMint  = Grad @(31, 166, 120)  @(9, 88, 63)

    $g.FillPolygon($crownGold, [System.Drawing.PointF[]]@($tableL, $tableM, $girdleM, $girdleL))
    $g.FillPolygon($crownMint, [System.Drawing.PointF[]]@($tableM, $tableR, $girdleR, $girdleM))
    $g.FillPolygon($paveGold,  [System.Drawing.PointF[]]@($girdleL, $girdleM, $culet))
    $g.FillPolygon($paveMint,  [System.Drawing.PointF[]]@($girdleM, $girdleR, $culet))

    # A sliver of white along the table, so the stone looks lit rather than printed.
    $sheen = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(105, 255, 255, 255))
    $g.FillPolygon($sheen, [System.Drawing.PointF[]]@(
        $tableL, $tableR,
        (Pt 0.628 0.300), (Pt 0.372 0.300)))

    # Facet seams: the girdle across the widest point, and the split between the two currencies.
    # Only where there are pixels enough for a line to be a line and not a smear.
    if ($s -ge 32) {
        $seam = New-Object System.Drawing.Pen(
            [System.Drawing.Color]::FromArgb(80, 11, 14, 20), [float]([Math]::Max(1.0, $s * 0.022)))
        $g.DrawLine($seam, $girdleL, $girdleR)
        $g.DrawLine($seam, $tableM, $culet)
        $seam.Dispose()
    }

    # Dark contour, so the mark holds its shape on a light taskbar as well as a dark one.
    $edge = New-Object System.Drawing.Pen(
        [System.Drawing.Color]::FromArgb(170, 8, 11, 16), [float]([Math]::Max(1.0, $s * 0.038)))
    $edge.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $g.DrawPolygon($edge, [System.Drawing.PointF[]]@($tableL, $tableR, $girdleR, $culet, $girdleL))
    $edge.Dispose()

    $crownGold.Dispose(); $crownMint.Dispose(); $paveGold.Dispose(); $paveMint.Dispose()
    $sheen.Dispose(); $g.Dispose()
    return $bmp
}

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$blobs = @()
foreach ($s in $sizes) {
    $bmp = New-Frame $s
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $blobs += , $ms.ToArray()
    $ms.Dispose(); $bmp.Dispose()
}

$fs = [System.IO.File]::Create($Out)
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([uint16]0)                 # reserved
$bw.Write([uint16]1)                 # type: icon
$bw.Write([uint16]$sizes.Count)

$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $s = $sizes[$i]
    $bw.Write([byte]($(if ($s -ge 256) { 0 } else { $s })))
    $bw.Write([byte]($(if ($s -ge 256) { 0 } else { $s })))
    $bw.Write([byte]0)               # palette
    $bw.Write([byte]0)               # reserved
    $bw.Write([uint16]1)             # planes
    $bw.Write([uint16]32)            # bpp
    $bw.Write([uint32]$blobs[$i].Length)
    $bw.Write([uint32]$offset)
    $offset += $blobs[$i].Length
}
foreach ($b in $blobs) { $bw.Write($b) }
$bw.Flush(); $bw.Close(); $fs.Close()

Write-Host "wrote $Out ($((Get-Item $Out).Length) bytes, $($sizes.Count) frames)"
