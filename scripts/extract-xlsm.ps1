$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$RNS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

function Get-SstText($si) {
    if ($null -eq $si) { return '' }
    if ($si.t -ne $null) {
        if ($si.t -is [string]) { return $si.t }
        if ($si.t.'#text') { return $si.t.'#text' }
        return ''
    }
    if ($si.r) {
        $txt = ''
        foreach ($run in $si.r) {
            if ($run.t -is [string]) { $txt += $run.t }
            elseif ($run.t.'#text') { $txt += $run.t.'#text' }
        }
        return $txt
    }
    return ''
}

function Get-WorkbookInfo($path) {
    $fs = [System.IO.File]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
    $zip = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Read)
    $ss = @()
    $ssEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' }
    if ($ssEntry) {
        $r = New-Object System.IO.StreamReader($ssEntry.Open())
        $ssXml = [xml]$r.ReadToEnd(); $r.Close()
        foreach ($si in $ssXml.sst.si) { $ss += (Get-SstText $si) }
    }
    $wbEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/workbook.xml' }
    $r2 = New-Object System.IO.StreamReader($wbEntry.Open())
    $wbXml = [xml]$r2.ReadToEnd(); $r2.Close()
    $relEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/_rels/workbook.xml.rels' }
    $r3 = New-Object System.IO.StreamReader($relEntry.Open())
    $relXml = [xml]$r3.ReadToEnd(); $r3.Close()
    $relMap = @{}
    foreach ($rel in $relXml.Relationships.Relationship) { $relMap[$rel.Id] = $rel.Target }
    $map = @{}
    foreach ($s in $wbXml.workbook.sheets.sheet) { $rid = $s.GetAttribute('id', $RNS); $map[$s.name] = $relMap[$rid] }
    return @{ Zip = $zip; Fs = $fs; SharedStrings = $ss; Map = $map }
}

function Get-CellText($c, $ss) {
    if ($null -eq $c.v -and $null -eq $c.is) { return $null }
    if ($c.t -eq 's') { return $ss[[int]$c.v] }
    elseif ($c.t -eq 'inlineStr') { return Get-SstText $c.is }
    elseif ($c.t -eq 'str') { return $c.v }
    else { return $c.v }
}

function Export-Sheet($wb, $sheetName, $outPath, $maxRows = 5000) {
    $target = $wb.Map[$sheetName]
    if (-not $target) { Write-Host "  [Sheet not found: $sheetName]"; return }
    $path = 'xl/' + $target
    $entry = $wb.Zip.Entries | Where-Object { $_.FullName -eq $path }
    $r = New-Object System.IO.StreamReader($entry.Open())
    $xml = [xml]$r.ReadToEnd(); $r.Close()
    $rows = $xml.worksheet.sheetData.row
    $out = New-Object System.Collections.Generic.List[string]
    $count = 0
    foreach ($row in $rows) {
        if ($count -ge $maxRows) { break }
        $vals = @()
        foreach ($c in $row.c) {
            $txt = Get-CellText $c $wb.SharedStrings
            if ($null -ne $txt -and "$txt" -ne '') {
                $safe = ("$txt") -replace '\|', '/' -replace '[\r\n]+', ' '
                $vals += "$($c.r)=$safe"
            }
        }
        if ($vals.Count -gt 0) { $out.Add(("R{0}: {1}" -f $row.r, ($vals -join ' | '))) }
        $count++
    }
    $out | Out-File -FilePath $outPath -Encoding utf8
    Write-Host "Exported $sheetName -> $outPath ($($out.Count) non-empty rows / $($rows.Count) total)"
}

$path1 = "G:\Mon Drive\02 - IMMOBILIER\01 - Gestion locative\Gestion locative v13.xlsm"
$wb = Get-WorkbookInfo $path1

$outDir = "C:\Users\PierreJAUBERT\Documents\PilotageLocatif\scripts\extracted"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Export-Sheet $wb '11 RUE DES CAILLOUX - 4EME' "$outDir\cailloux4.txt"
Export-Sheet $wb '11 RUE DES CAILLOUX - 5EME' "$outDir\cailloux5.txt"
Export-Sheet $wb '22 RUE CHANCE MILLY' "$outDir\chancemilly.txt"
Export-Sheet $wb 'FOYER SAINTE MARIE' "$outDir\foyersaintemarie.txt"
Export-Sheet $wb 'Locataires data' "$outDir\locataires-data.txt"
Export-Sheet $wb 'Quittance data' "$outDir\quittance-data.txt"
Export-Sheet $wb 'Contrat' "$outDir\contrat.txt"
Export-Sheet $wb 'Logement' "$outDir\logement.txt"
Export-Sheet $wb 'Logement data' "$outDir\logement-data.txt"
Export-Sheet $wb 'Contrat template' "$outDir\contrat-template.txt" 500
Export-Sheet $wb 'Cautionnement' "$outDir\cautionnement.txt" 500
Export-Sheet $wb 'Depot garantie template' "$outDir\depot-garantie-template.txt" 500
Export-Sheet $wb 'RIB' "$outDir\rib.txt" 500
Export-Sheet $wb 'Comptabilite' "$outDir\comptabilite.txt" 500

$wb.Zip.Dispose(); $wb.Fs.Dispose()
Write-Host "DONE"
