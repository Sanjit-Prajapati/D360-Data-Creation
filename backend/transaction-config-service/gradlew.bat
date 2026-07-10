@if "%DEBUG%" == "" @echo off
set DIRNAME=%~dp0
if "%DIRNAME%" == "" set DIRNAME=.
set APP_HOME=%DIRNAME%
if "%APP_HOME:~-1%"=="\" set APP_HOME=%APP_HOME:~0,-1%

set CLASSPATH="%APP_HOME%\gradle\wrapper\gradle-wrapper.jar"
java -classpath %CLASSPATH% org.gradle.wrapper.GradleWrapperMain %*
