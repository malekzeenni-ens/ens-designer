Dim psFile
psFile = "C:\Users\malek\Dropbox\_Etch_n_Shine\AI-Custom-Apps\EnS Designer\ens_launch.ps1"

CreateObject("WScript.Shell").Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & psFile & """", 0, False
