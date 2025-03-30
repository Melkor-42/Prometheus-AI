#NoEnv
#SingleInstance Force

; Remap Ctrl+W to select word (equivalent to Ctrl+Shift+Right)
^w::
Send, ^+{Right}
return 