!macro customUnInstall
  StrCpy $0 "$PROFILE\.cache\openwhispr\models"
  IfFileExists "$0\*.*" 0 +3
    RMDir /r "$0"
    DetailPrint "Removed VoiceInk cached models"
  StrCpy $1 "$PROFILE\.cache\openwhispr"
  RMDir "$1"
!macroend
