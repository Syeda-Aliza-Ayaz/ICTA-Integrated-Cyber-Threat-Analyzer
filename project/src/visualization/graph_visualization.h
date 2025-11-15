// // // #pragma once
// // // #include <string>
// // // #include <vector>
// // // #include <utility>

// // // class Graph; // forward

// // // namespace viz {
// // //     // Simple circular layout plotter using sciplot/gnuplot.
// // //     // nodes: vector of node ids
// // //     // edges: vector of pairs (u,v)
// // //     // node_sizes and node_labels optional (same length as nodes)
// // //     bool plotGraphPNG(const std::string &outpath,
// // //                       const std::vector<std::string> &nodes,
// // //                       const std::vector<std::pair<std::string,std::string>> &edges,
// // //                       const std::vector<int> &node_severity = {},
// // //                       const std::vector<std::string> &node_labels = {});
// // // }
// // #pragma once
// // #include <string>
// // #include <vector>
// // #include <utility>
// // #include <unordered_map>

// // class Graph; // forward

// // namespace viz {
// //     // Dynamic layout plotter using sciplot/gnuplot.
// //     // nodes: vector of node ids
// //     // edges: vector of pairs (u,v)
// //     // node_severity and node_labels optional (same length as nodes)
// //     // cluster_map: maps node IDs to cluster IDs for coloring/grouping
// //     bool plotGraphPNG(const std::string &outpath,
// //                       const std::vector<std::string> &nodes,
// //                       const std::vector<std::pair<std::string, std::string>> &edges,
// //                       const std::vector<int> &node_severity = {},
// //                       const std::vector<std::string> &node_labels = {},
// //                       const std::unordered_map<std::string, int> &cluster_map = {});
// // }
// #pragma once
// #include <string>
// #include <vector>
// #include <utility>
// #include <unordered_map>

// namespace viz {
//     bool plotGraphPNG(const std::string &outpath,
//                       const std::vector<std::string> &nodes,
//                       const std::vector<std::pair<std::string, std::string>> &edges,
//                       const std::vector<int> &node_severity = {},
//                       const std::vector<std::string> &node_labels = {},
//                       const std::unordered_map<std::string, int> &cluster_map = {});
// }
#pragma once
#include <string>
#include <vector>
#include <utility>
#include <unordered_map>

class Graph; // forward

namespace viz {
    // Dynamic layout plotter using sciplot/gnuplot.
    // nodes: vector of node ids
    // edges: vector of pairs (u,v)
    // node_severity and node_labels optional (same length as nodes)
    // cluster_map: maps node IDs to cluster IDs for coloring/grouping
    // colour: true for coloured clusters, false for B&W
    bool plotGraphPNG(const std::string &outpath,
                      const std::vector<std::string> &nodes,
                      const std::vector<std::pair<std::string,std::string>> &edges,
                      const std::vector<int> &node_severity = {},
                      const std::vector<std::string> &node_labels = {},
                      const std::unordered_map<std::string, int> &cluster_map = {},
                      bool colour = true);
}