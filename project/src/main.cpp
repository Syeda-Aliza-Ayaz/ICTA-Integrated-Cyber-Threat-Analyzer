// #include <windows.h>
// #include <iostream>
// #include "ioc_search/ioc_search.h"
// #include "cache/lru_cache.h"
// #include "threat_scoring/threat_scoring.h"
// #include "graph/graph.h"
// #include "union_find/union_find.h"
// #include "recent/recent_searches.h"
// #include "visualization/graph_visualization.h"

// void showMenu()
// {
//     std::cout << "\n================ Unified Cyber Threat Analyzer ================\n";
//     std::cout << "1. Search IoC\n";
//     std::cout << "2. View Cache\n";
//     std::cout << "3. Show Top Threats\n";
//     std::cout << "4. View Threat Graph (BFS/DFS)\n";
//     std::cout << "5. Detect Threat Clusters\n";
//     std::cout << "6. Find Connection Path\n";
//     std::cout << "7. Display Full Graph\n";
//     std::cout << "8. View Recent Searches\n";
//     std::cout << "9. Exit\n";
//     std::cout << "==============================================================\n";
//     std::cout << "Enter choice: ";
// }

// int main()
// {
//     SetConsoleOutputCP(CP_UTF8);

//     IoCSearch search;
//     if (!search.loadFromJSON("../data/mock_data.json"))
//     {
//         std::cout << "⚠️  Failed to load IoC data. Check file path or format.\n";
//         return 1;
//     }

//     std::vector<IoCRecord> &data = search.getData();
//     if (data.empty())
//     {
//         std::cout << "⚠️  No IoC data available to analyze.\n";
//     }

//     // Core components
//     LRUCache cache(5);
//     ThreatScoring::assignScores(data);
//     Graph threatGraph;
//     UnionFind clusterDetector;
//     RecentSearches recent(10); // store up to 10 recent IoC searches

//     // Build threat graph + clusters
//     std::cout << "🔨 Building threat graph...\n";
//     for (const auto &record : data)
//     {
//         threatGraph.addNodeWithDetails(record.ioc, record.type, record.score);
//         clusterDetector.makeSet(record.ioc);

//         for (const auto &related : record.relatedIoCs)
//         {
//             if (search.searchIoC(related))
//             {
//                 threatGraph.addEdge(record.ioc, related);
//                 clusterDetector.unite(record.ioc, related);
//             }
//         }
//     }
//     std::cout << "✅ Graph built with " << threatGraph.size() << " nodes\n";

//     int choice;
//     std::string query;

//     while (true)
//     {
//         showMenu();
//         std::cin >> choice;
//         std::cin.ignore();

//         if (choice == 1)
//         {
//             std::cout << "\nEnter IoC to search: ";
//             std::getline(std::cin, query);

//             // Add to recent searches
//             recent.addSearch(query);

//             // Check cache
//             IoCRecord *cached = cache.get(query);
//             if (cached)
//             {
//                 std::cout << "⚡ Found in cache!\n";
//                 search.displayRecord(*cached);
//             }
//             else
//             {
//                 IoCRecord *result = search.searchIoC(query);
//                 if (result)
//                 {
//                     cache.put(query, *result);
//                     search.displayRecord(*result);
//                 }
//                 else
//                 {
//                     std::cout << "⚠️  IoC not found in local database.\n";
//                 }
//             }
//         }

//         else if (choice == 2)
//         {
//             if (cache.isEmpty())
//             {
//                 std::cout << "📭 Cache is empty — search for something first.\n";
//             }
//             else
//             {
//                 cache.displayCache();
//             }
//         }

//         else if (choice == 3)
//         {
//             if (data.empty())
//             {
//                 std::cout << "📭 No data available to show threats.\n";
//             }
//             else
//             {
//                 ThreatScoring::showTopThreats(data, 3);
//             }
//         }

//         else if (choice == 4)
//         {
//             std::cout << "\nEnter IoC to explore: ";
//             std::getline(std::cin, query);

//             if (!threatGraph.hasNode(query))
//             {
//                 std::cout << "⚠️  IoC not found in graph.\n";
//                 continue;
//             }

//             std::cout << "\n--- Graph Traversal Options ---\n";
//             std::cout << "1. BFS (Breadth-First)\n";
//             std::cout << "2. DFS (Depth-First)\n";
//             std::cout << "Choose traversal method: ";

//             int traversalChoice;
//             std::cin >> traversalChoice;
//             std::cin.ignore();

//             std::vector<std::string> connectedIoCs;

//             if (traversalChoice == 1)
//             {
//                 connectedIoCs = threatGraph.bfs(query);
//                 std::cout << "\n🔍 BFS Traversal from " << query << ":\n";
//             }
//             else if (traversalChoice == 2)
//             {
//                 connectedIoCs = threatGraph.dfs(query);
//                 std::cout << "\n🔍 DFS Traversal from " << query << ":\n";
//             }
//             else
//             {
//                 std::cout << "❌ Invalid choice.\n";
//                 continue;
//             }

//             std::cout << "Found " << connectedIoCs.size() << " connected IoCs:\n";
//             for (size_t i = 0; i < connectedIoCs.size(); i++)
//             {
//                 Node *node = threatGraph.getNodeDetails(connectedIoCs[i]);
//                 if (node)
//                 {
//                     std::cout << (i + 1) << ". " << node->ioc
//                               << " (" << node->type << ", Severity: "
//                               << node->severity << ")\n";
//                 }
//                 else
//                 {
//                     std::cout << (i + 1) << ". " << connectedIoCs[i] << "\n";
//                 }
//             }
//         }

//         // ... (previous code remains unchanged until option 5)

//         // else if (choice == 5)
//         // {
//         //     std::cout << "\n🔍 Detecting Threat Clusters...\n";
//         //     auto clusters = clusterDetector.getClusters();

//         //     std::cout << "Found " << clusters.size() << " distinct threat campaigns:\n\n";
//         //     int campaignNum = 1;

//         //     // Prepare data for visualization
//         //     std::vector<std::string> nodes = threatGraph.getAllNodes();
//         //     std::vector<std::pair<std::string, std::string>> edges = threatGraph.getAllEdges();
//         //     std::vector<int> severities;
//         //     std::vector<std::string> labels;
//         //     for (const auto& id : nodes) {
//         //         Node* nd = threatGraph.getNodeDetails(id);
//         //         if (nd) severities.push_back(nd->severity);
//         //         else severities.push_back(1);
//         //         labels.push_back(id);
//         //     }

//         //     // Create cluster map
//         //     std::unordered_map<std::string, int> cluster_map;
//         //     int cluster_id = 0;
//         //     for (const auto& cluster : clusters) {
//         //         for (const auto& ioc : cluster.second) {
//         //             cluster_map[ioc] = cluster_id;
//         //         }
//         //         cluster_id++;
//         //     }

//         //     // Visualize clusters
//         //     try {
//         //         viz::plotGraphPNG("cluster_graph.png", nodes, edges, severities, labels, cluster_map);
//         //         std::cout << "✅ Cluster graph saved as cluster_graph.png\n";
//         //     } catch (const std::exception& e) {
//         //         std::cout << "⚠️ Failed to generate cluster graph: " << e.what() << "\n";
//         //     }

//         //     // Display text output (original logic)
//         //     campaignNum = 1;
//         //     for (const auto& cluster : clusters) {
//         //         if (cluster.second.size() > 1) {
//         //             std::cout << "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
//         //             std::cout << "🎯 Campaign " << campaignNum++ << " (" << cluster.second.size() << " IoCs)\n";
//         //             std::cout << "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
//         //             for (const auto& ioc : cluster.second) {
//         //                 Node* node = threatGraph.getNodeDetails(ioc);
//         //                 if (node) {
//         //                     std::cout << "  • " << node->ioc
//         //                               << " [" << node->type << "] "
//         //                               << "(Severity: " << node->severity << ")\n";
//         //                 }
//         //             }
//         //             std::cout << "\n";
//         //         }
//         //     }
//         // }

//         else if (choice == 5)
//         {
//             std::cout << "\n🔍 Detecting Threat Clusters...\n";
//             auto clusters = clusterDetector.getClusters();

//             std::cout << "Found " << clusters.size() << " distinct threat campaigns:\n\n";
//             int campaignNum = 1;

//             // Prepare data for visualization
//             std::vector<std::string> nodes = threatGraph.getAllNodes();
//             std::vector<std::pair<std::string, std::string>> edges = threatGraph.getAllEdges();
//             std::vector<int> severities;
//             std::vector<std::string> labels;
//             for (const auto &id : nodes)
//             {
//                 Node *nd = threatGraph.getNodeDetails(id);
//                 if (nd)
//                     severities.push_back(nd->severity);
//                 else
//                     severities.push_back(1);
//                 labels.push_back(id);
//             }

//             // Create cluster map
//             std::unordered_map<std::string, int> cluster_map;
//             int cluster_id = 0;
//             for (const auto &cluster : clusters)
//             {
//                 for (const auto &ioc : cluster.second)
//                 {
//                     cluster_map[ioc] = cluster_id;
//                 }
//                 cluster_id++;
//             }

//             // Visualize clusters
//             try
//             {
//                 viz::plotGraphPNG("../cluster_graph.png", nodes, edges, severities, labels, cluster_map);
//                 std::cout << "✅ Cluster graph saved as cluster_graph.png\n";
//             }
//             catch (const std::exception &e)
//             {
//                 std::cout << "⚠️ Failed to generate cluster graph: " << e.what() << "\n";
//             }

//             // Display text output
//             campaignNum = 1;
//             for (const auto &cluster : clusters)
//             {
//                 if (cluster.second.size() > 1)
//                 {
//                     std::cout << "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
//                     std::cout << "🎯 Campaign " << campaignNum++ << " (" << cluster.second.size() << " IoCs)\n";
//                     std::cout << "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
//                     for (const auto &ioc : cluster.second)
//                     {
//                         Node *node = threatGraph.getNodeDetails(ioc);
//                         if (node)
//                         {
//                             std::cout << "  • " << node->ioc
//                                       << " [" << node->type << "] "
//                                       << "(Severity: " << node->severity << ")\n";
//                         }
//                     }
//                     std::cout << "\n";
//                 }
//             }
//         }

//         // ... (rest of the code remains unchanged)

//         // else if (choice == 5)
//         // {
//         //     std::cout << "\n🔍 Detecting Threat Clusters...\n";
//         //     auto clusters = clusterDetector.getClusters();

//         //     std::cout << "Found " << clusters.size() << " distinct threat campaigns:\n\n";
//         //     int campaignNum = 1;
//         //     for (const auto &cluster : clusters)
//         //     {
//         //         if (cluster.second.size() > 1)
//         //         {
//         //             std::cout << "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
//         //             std::cout << "🎯 Campaign " << campaignNum++ << " (" << cluster.second.size() << " IoCs)\n";
//         //             std::cout << "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
//         //             for (const auto &ioc : cluster.second)
//         //             {
//         //                 Node *node = threatGraph.getNodeDetails(ioc);
//         //                 if (node)
//         //                 {
//         //                     std::cout << "  • " << node->ioc
//         //                               << " [" << node->type << "] "
//         //                               << "(Severity: " << node->severity << ")\n";
//         //                 }
//         //             }
//         //             std::cout << "\n";
//         //         }
//         //     }
//         // }

//         else if (choice == 6)
//         {
//             std::string src, dst;
//             std::cout << "\nEnter source IoC: ";
//             std::getline(std::cin, src);
//             std::cout << "Enter destination IoC: ";
//             std::getline(std::cin, dst);

//             if (!threatGraph.hasNode(src) || !threatGraph.hasNode(dst))
//             {
//                 std::cout << "⚠️  One or both IoCs not found in graph.\n";
//                 continue;
//             }

//             auto path = threatGraph.shortestPath(src, dst);
//             if (path.empty())
//             {
//                 std::cout << "❌ No connection found between " << src << " and " << dst << "\n";
//             }
//             else
//             {
//                 std::cout << "\n🛣️  Connection Path (" << path.size() << " hops):\n";
//                 for (size_t i = 0; i < path.size(); i++)
//                 {
//                     std::cout << path[i];
//                     if (i < path.size() - 1)
//                         std::cout << " → ";
//                 }
//                 std::cout << "\n";
//             }
//         }

//         // else if (choice == 7)
//         // {
//         //     auto nodes = threatGraph.getAllNodes();
//         //     auto edges = threatGraph.getAllEdges();

//         //     // optional: collect severity and labels aligned with nodes vector
//         //     std::vector<int> severities;
//         //     std::vector<std::string> labels;
//         //     for (const auto &id : nodes)
//         //     {
//         //         Node *nd = threatGraph.getNodeDetails(id);
//         //         if (nd)
//         //             severities.push_back(nd->severity);
//         //         else
//         //             severities.push_back(1);
//         //         labels.push_back(id);
//         //     }
//         //     // In main.cpp, option 7 block
//         //     auto clusters = clusterDetector.getClusters();
//         //     std::unordered_map<std::string, int> cluster_map;
//         //     int cluster_id = 0;
//         //     for (const auto &cluster : clusters)
//         //     {
//         //         for (const auto &ioc : cluster.second)
//         //         {
//         //             cluster_map[ioc] = cluster_id;
//         //         }
//         //         cluster_id++;
//         //     }
//         //     viz::plotGraphPNG("threat_graph.png", nodes, edges, severities, labels, cluster_map);
//         //     std::cout << "Saved threat_graph.png\n";
//         // }
//         else if (choice == 7)
//         {
//             auto nodes = threatGraph.getAllNodes();
//             auto edges = threatGraph.getAllEdges();

//             std::vector<int> severities;
//             std::vector<std::string> labels;
//             for (const auto &id : nodes)
//             {
//                 Node *nd = threatGraph.getNodeDetails(id);
//                 if (nd)
//                     severities.push_back(nd->severity);
//                 else
//                     severities.push_back(1);
//                 labels.push_back(id);
//             }

//             viz::plotGraphPNG("threat_graph.png", nodes, edges, severities, labels);
//             std::cout << "Saved threat_graph.png\n";
//         }

//         else if (choice == 8)
//         {
//             recent.displayHistory();
//         }

//         else if (choice == 9)
//         {
//             std::cout << "👋 Exiting Unified CTA. Stay secure!\n";
//             break;
//         }

//         else
//         {
//             std::cout << "❌ Invalid choice. Try again.\n";
//         }
//     }

//     return 0;
// }
#include <windows.h>
#include <iostream>
#include <chrono>
#include <iomanip>
#include <sstream>
#include <filesystem> // For creating images/ folder
#include "ioc_search/ioc_search.h"
#include "cache/lru_cache.h"
#include "threat_scoring/threat_scoring.h"
#include "graph/graph.h"
#include "union_find/union_find.h"
#include "recent/recent_searches.h"
#include "visualization/graph_visualization.h"

void showMenu()
{
    std::cout << "\n================ Unified Cyber Threat Analyzer ================\n";
    std::cout << "1. Search IoC\n";
    std::cout << "2. View Cache\n";
    std::cout << "3. Show Top Threats\n";
    std::cout << "4. View Threat Graph (BFS/DFS)\n";
    std::cout << "5. Detect Threat Clusters\n";
    std::cout << "6. Find Connection Path\n";
    std::cout << "7. Display Full Graph\n";
    std::cout << "8. View Recent Searches\n";
    std::cout << "9. Exit\n";
    std::cout << "==============================================================\n";
    std::cout << "Enter choice: ";
}

int main()
{
    SetConsoleOutputCP(CP_UTF8);

    // Create images/ folder if it doesn't exist
    std::filesystem::create_directories("../../images");

    IoCSearch search;
    if (!search.loadFromJSON("../data/mock_data.json"))
    {
        std::cout << "Failed to load IoC data. Check file path or format.\n";
        return 1;
    }

    std::vector<IoCRecord> &data = search.getData();
    if (data.empty())
    {
        std::cout << "No IoC data available to analyze.\n";
    }

    // Core components
    LRUCache cache(5);
    ThreatScoring::assignScores(data);
    Graph threatGraph;
    UnionFind clusterDetector;
    RecentSearches recent(10); // store up to 10 recent IoC searches

    // Build threat graph + clusters
    std::cout << "Building threat graph...\n";
    for (const auto &record : data)
    {
        threatGraph.addNodeWithDetails(record.ioc, record.type, record.score);
        clusterDetector.makeSet(record.ioc);

        for (const auto &related : record.relatedIoCs)
        {
            if (search.searchIoC(related))
            {
                threatGraph.addEdge(record.ioc, related);
                clusterDetector.unite(record.ioc, related);
            }
        }
    }
    std::cout << "Graph built with " << threatGraph.size() << " nodes\n";

    int choice;
    std::string query;

    while (true)
    {
        showMenu();
        std::cin >> choice;
        std::cin.ignore();

        if (choice == 1)
        {
            std::cout << "\nEnter IoC to search: ";
            std::getline(std::cin, query);

            // Add to recent searches
            recent.addSearch(query);

            // Check cache
            IoCRecord *cached = cache.get(query);
            if (cached)
            {
                std::cout << "Found in cache!\n";
                search.displayRecord(*cached);
            }
            else
            {
                IoCRecord *result = search.searchIoC(query);
                if (result)
                {
                    cache.put(query, *result);
                    search.displayRecord(*result);
                }
                else
                {
                    std::cout << "IoC not found in local database.\n";
                }
            }
        }

        else if (choice == 2)
        {
            if (cache.isEmpty())
            {
                std::cout << "Cache is empty — search for something first.\n";
            }
            else
            {
                cache.displayCache();
            }
        }

        else if (choice == 3)
        {
            if (data.empty())
            {
                std::cout << "No data available to show threats.\n";
            }
            else
            {
                ThreatScoring::showTopThreats(data, 3);
            }
        }

        else if (choice == 4)
        {
            std::cout << "\nEnter IoC to explore: ";
            std::getline(std::cin, query);

            if (!threatGraph.hasNode(query))
            {
                std::cout << "IoC not found in graph.\n";
                continue;
            }

            std::cout << "\n--- Graph Traversal Options ---\n";
            std::cout << "1. BFS (Breadth-First)\n";
            std::cout << "2. DFS (Depth-First)\n";
            std::cout << "Choose traversal method: ";

            int traversalChoice;
            std::cin >> traversalChoice;
            std::cin.ignore();

            std::vector<std::string> connectedIoCs;

            if (traversalChoice == 1)
            {
                connectedIoCs = threatGraph.bfs(query);
                std::cout << "\nBFS Traversal from " << query << ":\n";
            }
            else if (traversalChoice == 2)
            {
                connectedIoCs = threatGraph.dfs(query);
                std::cout << "\nDFS Traversal from " << query << ":\n";
            }
            else
            {
                std::cout << "Invalid choice.\n";
                continue;
            }

            std::cout << "Found " << connectedIoCs.size() << " connected IoCs:\n";
            for (size_t i = 0; i < connectedIoCs.size(); i++)
            {
                Node *node = threatGraph.getNodeDetails(connectedIoCs[i]);
                if (node)
                {
                    std::cout << (i + 1) << ". " << node->ioc
                              << " (" << node->type << ", Severity: "
                              << node->severity << ")\n";
                }
                else
                {
                    std::cout << (i + 1) << ". " << connectedIoCs[i] << "\n";
                }
            }
        }

        else if (choice == 5)
        {
            std::cout << "\nDetecting Threat Clusters...\n";
            auto clusters = clusterDetector.getClusters();

            std::cout << "Found " << clusters.size() << " distinct threat campaigns:\n\n";
            int campaignNum = 1;

            // Prepare data for visualization
            std::vector<std::string> nodes = threatGraph.getAllNodes();
            std::vector<std::pair<std::string, std::string>> edges = threatGraph.getAllEdges();
            std::vector<int> severities;
            std::vector<std::string> labels;
            for (const auto &id : nodes)
            {
                Node *nd = threatGraph.getNodeDetails(id);
                if (nd)
                    severities.push_back(nd->severity);
                else
                    severities.push_back(1);
                labels.push_back(id);
            }

            // Create cluster map
            std::unordered_map<std::string, int> cluster_map;
            int cluster_id = 0;
            for (const auto &cluster : clusters)
            {
                for (const auto &ioc : cluster.second)
                {
                    cluster_map[ioc] = cluster_id;
                }
                cluster_id++;
            }

            /// timestamped file name
            auto now = std::chrono::system_clock::now();
            auto t = std::chrono::system_clock::to_time_t(now);
            std::stringstream ss;
            ss << std::put_time(std::localtime(&t), "%Y%m%d_%H%M%S");
            std::string out = "../../images/cluster_graph_" + ss.str() + ".png";

            try
            {
                if (viz::plotGraphPNG(out, nodes, edges, severities, labels, cluster_map, true))
                    std::cout << "Cluster graph saved: " << out << "\n";
            }
            catch (const std::exception &e)
            {
                std::cout << "Failed to generate cluster graph: " << e.what() << "\n";
            }

            // Display text output
            campaignNum = 1;
            for (const auto &cluster : clusters)
            {
                if (cluster.second.size() > 1)
                {
                    std::cout << "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
                    std::cout << "Campaign " << campaignNum++ << " (" << cluster.second.size() << " IoCs)\n";
                    std::cout << "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
                    for (const auto &ioc : cluster.second)
                    {
                        Node *node = threatGraph.getNodeDetails(ioc);
                        if (node)
                        {
                            std::cout << "  • " << node->ioc
                                      << " [" << node->type << "] "
                                      << "(Severity: " << node->severity << ")\n";
                        }
                    }
                    std::cout << "\n";
                }
            }
        }

        else if (choice == 6)
        {
            std::string src, dst;
            std::cout << "\nEnter source IoC: ";
            std::getline(std::cin, src);
            std::cout << "Enter destination IoC: ";
            std::getline(std::cin, dst);

            if (!threatGraph.hasNode(src) || !threatGraph.hasNode(dst))
            {
                std::cout << "One or both IoCs not found in graph.\n";
                continue;
            }

            auto path = threatGraph.shortestPath(src, dst);
            if (path.empty())
            {
                std::cout << "No connection found between " << src << " and " << dst << "\n";
            }
            else
            {
                std::cout << "\nConnection Path (" << path.size() << " hops):\n";
                for (size_t i = 0; i < path.size(); i++)
                {
                    std::cout << path[i];
                    if (i < path.size() - 1)
                        std::cout << " → ";
                }
                std::cout << "\n";
            }
        }

        // else if (choice == 7)
        // {
        //     auto nodes = threatGraph.getAllNodes();
        //     auto edges = threatGraph.getAllEdges();

        //     std::vector<int> severities;
        //     std::vector<std::string> labels;
        //     for (const auto &id : nodes)
        //     {
        //         Node *nd = threatGraph.getNodeDetails(id);
        //         if (nd)
        //             severities.push_back(nd->severity);
        //         else
        //             severities.push_back(1);
        //         labels.push_back(id);
        //     }

        //     // Generate timestamped filename
        //     auto now = std::chrono::system_clock::now();
        //     auto in_time_t = std::chrono::system_clock::to_time_t(now);
        //     std::stringstream ss;
        //     ss << std::put_time(std::localtime(&in_time_t), "%Y%m%d_%H%M%S");
        //     std::string timestamp = ss.str();
        //     std::string outpath = "../../images/threat_graph_" + timestamp + ".png";

        //     if (viz::plotGraphPNG(outpath, nodes, edges, severities, labels))
        //     {
        //         std::cout << "Threat graph saved: " << outpath << "\n";
        //     }
        // }
        else if (choice == 7) // FULL THREAT GRAPH – plain red nodes, no colours
        {
            auto nodes = threatGraph.getAllNodes();
            auto edges = threatGraph.getAllEdges();

            std::vector<int> severities;
            std::vector<std::string> labels;
            for (const auto &id : nodes)
            {
                Node *nd = threatGraph.getNodeDetails(id);
                severities.push_back(nd ? nd->severity : 1);
                labels.push_back(id);
            }

            // timestamped file name
            auto now = std::chrono::system_clock::now();
            auto t = std::chrono::system_clock::to_time_t(now);
            std::stringstream ss;
            ss << std::put_time(std::localtime(&t), "%Y%m%d_%H%M%S");
            std::string out = "../images/threat_graph_" + ss.str() + ".png";

            try
            {
                // false → black-and-white version
                if (viz::plotGraphPNG(out, nodes, edges, severities, labels, {}, false))
                    std::cout << "Threat graph saved: " << out << "\n";
            }
            catch (...)
            { /* handled inside */
            }
        }

        else if (choice == 8)
        {
            recent.displayHistory();
        }

        else if (choice == 9)
        {
            std::cout << "Exiting Unified CTA. Stay secure!\n";
            break;
        }

        else
        {
            std::cout << "Invalid choice. Try again.\n";
        }
    }

    return 0;
}