# # # cmake_minimum_required(VERSION 3.16)
# # # project(unified_cta CXX)
# # # set(CMAKE_CXX_STANDARD 17)
# # # set(SRC_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src)


# # # file(GLOB_RECURSE SRC_FILES
# # # "${SRC_DIR}/*.cpp"
# # # )

# # # message(STATUS "Source files: ${SRC_FILES}")


# # # add_executable(unified_cta ${SRC_FILES})
# # # include_directories(${CMAKE_CURRENT_SOURCE_DIR}/src)


# # # # Optional: add gtest for tests later
# # # # enable_testing()
# # # # add_subdirectory(lib/googletest)

# # # # add when sciplot is used
# # # # find_package(PkgConfig REQUIRED)
# # # # pkg_check_modules(GNUPLOT REQUIRED gnuplot)

# # # # include_directories(${GNUPLOT_INCLUDE_DIRS})
# # # # link_directories(${GNUPLOT_LIBRARY_DIRS})

# # # # target_link_libraries(unified_cta ${GNUPLOT_LIBRARIES})
# # cmake_minimum_required(VERSION 3.16)
# # project(unified_cta CXX)

# # # Set C++ standard
# # set(CMAKE_CXX_STANDARD 17)
# # set(CMAKE_CXX_STANDARD_REQUIRED ON)

# # # --- Vcpkg Toolchain (not hardcoded) ---
# # # When configuring, run:
# # # cmake -S . -B build -DCMAKE_TOOLCHAIN_FILE=./vcpkg/scripts/buildsystems/vcpkg.cmake

# # # --- Find SciPlot package ---
# # find_package(sciplot CONFIG REQUIRED)

# # # --- Collect all source files recursively ---
# # set(SRC_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src)
# # file(GLOB_RECURSE SRC_FILES "${SRC_DIR}/*.cpp")

# # message(STATUS "Source files: ${SRC_FILES}")

# # # --- Create the executable ---
# # add_executable(unified_cta ${SRC_FILES})

# # # --- Include directories ---
# # target_include_directories(unified_cta PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)

# # # --- Link SciPlot properly ---
# # target_link_libraries(unified_cta PRIVATE sciplot::sciplot)
# cmake_minimum_required(VERSION 3.16)
# project(unified_cta CXX)

# # Set C++ standard
# set(CMAKE_CXX_STANDARD 17)
# set(CMAKE_CXX_STANDARD_REQUIRED ON)

# # --- Add Sciplot as a subdirectory (from cloned repo) ---
# add_subdirectory(sciplot)

# # --- Optional: Add gnuplot-palettes if cloned ---
# # add_subdirectory(gnuplot-palettes)  # Uncomment if you cloned it

# # --- Collect all source files recursively ---
# set(SRC_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src)
# file(GLOB_RECURSE SRC_FILES "${SRC_DIR}/*.cpp")

# message(STATUS "Source files: ${SRC_FILES}")

# # --- Create the executable ---
# add_executable(unified_cta ${SRC_FILES})

# # --- Include directories ---
# target_include_directories(unified_cta PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)

# # --- Link Sciplot ---
# target_link_libraries(unified_cta PRIVATE sciplot::sciplot)


cmake_minimum_required(VERSION 3.16)
project(unified_cta CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# --- Use vcpkg toolchain ---
set(CMAKE_TOOLCHAIN_FILE "${CMAKE_CURRENT_SOURCE_DIR}/vcpkg/scripts/buildsystems/vcpkg.cmake" CACHE STRING "vcpkg toolchain file")

# --- Find Sciplot package via vcpkg ---
find_package(sciplot CONFIG REQUIRED)

# --- Collect all source files recursively ---
set(SRC_DIR ${CMAKE_CURRENT_SOURCE_DIR}/src)
file(GLOB_RECURSE SRC_FILES "${SRC_DIR}/*.cpp")

message(STATUS "Source files: ${SRC_FILES}")

# --- Create the executable ---
add_executable(unified_cta ${SRC_FILES})

# --- Include directories ---
target_include_directories(unified_cta PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)

# --- Link Sciplot ---
target_link_libraries(unified_cta PRIVATE sciplot::sciplot)