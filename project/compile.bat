@echo off
echo.
echo  COMPILING C++ DSA ENGINE TO WASM...
echo.
mkdir ..\public 2>nul

"C:\Users\Syeda Aliza Ayaz\Documents\ICTA\dsa-project\emsdk\upstream\emscripten\emcc" ^
  wasm_engine.cpp ^
  src/graph/graph.cpp ^
  src/ioc_search/ioc_search.cpp ^
  src/union_find/union_find.cpp ^
  src/recent/recent_searches.cpp ^
  src/priority_queue/priority_queue.cpp ^
  src/trie/trie.cpp ^
  -I src ^
  -I src/nlohmann ^
  -o ..\public\dsa.js ^
  -s WASM=1 ^
  -s MODULARIZE=1 ^
  -s EXPORT_NAME="createDSAModule" ^
  -s EXPORTED_FUNCTIONS="[_initEngine,_searchIoC,_getRecentSearchesJSON,_getFullReportJSON,_getTopKThreats,_searchPrefix,_getGlobalGraphJSON,_getClusterGraphJSON,_getShortestPath,_setOTXData,_getTopThreatsByType, _getTypeGraphJSON, _malloc,_free]" ^
  -s EXPORTED_RUNTIME_METHODS="['ccall','cwrap','UTF8ToString','stringToUTF8']" ^
  -s ALLOW_MEMORY_GROWTH=1 ^
  -s TOTAL_MEMORY=134217728 ^
  -s ENVIRONMENT='web' ^
  -s ASYNCIFY=1 ^
  -s VERBOSE=1 ^ 
  -O3 ^
  -std=c++17

if %errorlevel% neq 0 (
  echo.
  echo  FAILED TO COMPILE!
  pause
  exit /b %errorlevel%
)

echo.
echo  SUCCESS! WASM READY
echo  Output: public/dsa.js + dsa.wasm
echo.
pause