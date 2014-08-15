#!/bin/bash
# Last revision : (2013-06-08 17-31)
# Tested : Debian 6.0, Mac OSX
# Author : Tinou
# Script licence : GPLv3
#
# This script is designed for PlayOnLinux and PlayOnMac.
#
# This script was customized for Acorn Community to hardcode the CD-ROM
# directory to /tmp/msofficecd
#


# CHANGELOG
# [Tinou] (2011-08-22 20-00)
#   Update for POL/POM 4
# [SuperPlumus] (2013-06-08 17-31)
#   gettext

[ "$PLAYONLINUX" = "" ] && exit 0
source "$PLAYONLINUX/lib/sources"

TITLE="Microsoft Office 2007"
PREFIXNAME="Office2007"

POL_Debug_Init
POL_SetupWindow_Init

POL_System_SetArch "x86"

#Preparation de Wine
POL_Wine_SelectPrefix "$PREFIXNAME"
POL_Wine_PrefixCreate "1.2.3"

cd "$POL_USER_ROOT/tmp"

POL_Wine "/tmp/msofficecd/setup.exe"

POL_Wine_OverrideDLL native,builtin riched20

#CREATION LANCEUR
POL_Shortcut "WINWORD.EXE" "Microsoft Word 2007"
POL_Shortcut "EXCEL.EXE" "Microsoft Excel 2007"
POL_Shortcut "POWERPNT.EXE" "Microsoft Powerpoint 2007"

POL_Call POL_Install_riched30

rm ~/PlayOnLinux\'s\ virtual\ drives

POL_SetupWindow_Close


exit
