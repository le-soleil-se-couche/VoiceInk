Option Explicit

Dim fso, shell, scriptDir, batPath
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = fso.BuildPath(scriptDir, "VoiceInk-Launch.bat")

If fso.FileExists(batPath) Then
  shell.Run """" & batPath & """", 0, False
Else
  MsgBox "Launcher file not found: " & batPath, vbExclamation, "VoiceInk Launcher"
End If
