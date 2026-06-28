#!/bin/sh
set -e
export ASPNETCORE_URLS="http://0.0.0.0:${PORT:-10000}"
exec dotnet AgileAi.Api.dll
