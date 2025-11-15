#define _USE_MATH_DEFINES
#include "graph_visualization.h"
#include <cmath>
#include <unordered_map>
#include <iostream>
#include <limits>
#include <random>
#include <algorithm>
#include <sciplot/sciplot.hpp>

using namespace sciplot;

namespace viz {

    void computeLayout(std::unordered_map<std::string, std::pair<double, double>>& coords,
                       const std::vector<std::string>& nodes,
                       const std::vector<std::pair<std::string, std::string>>& edges,
                       int iterations = 120) {
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_real_distribution<> dis(-1.0, 1.0);

        for (const auto& n : nodes)
            coords[n] = {dis(gen) * 1.5, dis(gen) * 1.5};

        const double k = 0.1, rep = 0.01, damp = 0.9;

        for (int it = 0; it < iterations; ++it) {
            std::unordered_map<std::string, std::pair<double, double>> force;
            for (const auto& n : nodes) force[n] = {0.0, 0.0};

            for (size_t i = 0; i < nodes.size(); ++i)
                for (size_t j = i + 1; j < nodes.size(); ++j) {
                    auto& p1 = coords[nodes[i]];
                    auto& p2 = coords[nodes[j]];
                    double dx = p2.first - p1.first;
                    double dy = p2.second - p1.second;
                    double d = std::hypot(dx, dy);
                    if (d < 0.01) d = 0.01;
                    double f = rep / (d * d);
                    force[nodes[i]].first  -= f * dx / d;
                    force[nodes[i]].second -= f * dy / d;
                    force[nodes[j]].first  += f * dx / d;
                    force[nodes[j]].second += f * dy / d;
                }

            for (const auto& e : edges) {
                auto it1 = coords.find(e.first);
                auto it2 = coords.find(e.second);
                if (it1 == coords.end() || it2 == coords.end()) continue;
                double dx = it2->second.first - it1->second.first;
                double dy = it2->second.second - it1->second.second;
                double d = std::hypot(dx, dy);
                if (d < 0.01) d = 0.01;
                double f = k * d;
                force[e.first].first  += f * dx / d;
                force[e.first].second += f * dy / d;
                force[e.second].first -= f * dx / d;
                force[e.second].second -= f * dy / d;
            }

            for (const auto& n : nodes) {
                auto& p = coords[n];
                auto& f = force[n];
                p.first  += f.first  * damp;
                p.second += f.second * damp;
            }
        }

        double minX = INFINITY, maxX = -INFINITY, minY = INFINITY, maxY = -INFINITY;
        for (const auto& n : nodes) {
            auto& p = coords[n];
            minX = std::min(minX, p.first);
            maxX = std::max(maxX, p.first);
            minY = std::min(minY, p.second);
            maxY = std::max(maxY, p.second);
        }
        double range = std::max({maxX - minX, maxY - minY, 1.0});
        double scale = 1.5 / range;
        for (auto& n : nodes) {
            auto& p = coords[n];
            p.first  = (p.first  - (minX + maxX) / 2) * scale;
            p.second = (p.second - (minY + maxY) / 2) * scale;
        }
    }

    bool plotGraphPNG(const std::string& outpath,
                      const std::vector<std::string>& nodes,
                      const std::vector<std::pair<std::string, std::string>>& edges,
                      const std::vector<int>& node_severity,
                      const std::vector<std::string>& node_labels,
                      const std::unordered_map<std::string, int>& cluster_map,
                      bool colour)
    {
        if (nodes.empty()) {
            std::cerr << "[viz] No nodes to plot.\n";
            return false;
        }

        std::unordered_map<std::string, std::pair<double, double>> coords;
        computeLayout(coords, nodes, edges);

        std::vector<double> nx, ny;
        for (const auto& n : nodes) {
            nx.push_back(coords[n].first);
            ny.push_back(coords[n].second);
        }

        try {
            Plot2D plot;
            plot.size(1200, 900);
            plot.xlabel("X Coordinate");
            plot.ylabel("Y Coordinate");
            plot.xrange(-1.8, 1.8);
            plot.yrange(-1.8, 1.8);

            // === 1. Background circles (cluster) ===
            std::string cluster_objects;
            if (colour && !cluster_map.empty()) {
                std::vector<std::string> bg = {"#ADD8E6", "#90EE90", "#FFFFE0", "#FFB6C1", "#E0FFFF"};
                std::unordered_map<int, std::pair<double, double>> centroids;
                std::unordered_map<int, int> sizes;
                for (const auto& n : nodes) {
                    int cid = cluster_map.count(n) ? cluster_map.at(n) : 0;
                    centroids[cid].first  += coords[n].first;
                    centroids[cid].second += coords[n].second;
                    ++sizes[cid];
                }
                int obj = 1;
                for (const auto& c : centroids) {
                    double cx = c.second.first  / sizes[c.first];
                    double cy = c.second.second / sizes[c.first];
                    double r  = 0.35 + 0.05 * std::log1p(sizes[c.first]);
                    cluster_objects += "set object " + std::to_string(obj++) +
                                       " circle at " + std::to_string(cx) + "," + std::to_string(cy) +
                                       " size " + std::to_string(r) +
                                       " fc rgb '" + bg[c.first % bg.size()] + "' fillstyle solid 0.3\n";
                }
            }

            // === 2. Edges ===
            std::vector<double> ex, ey;
            for (const auto& e : edges) {
                auto a = coords.find(e.first), b = coords.find(e.second);
                if (a == coords.end() || b == coords.end()) continue;
                ex.push_back(a->second.first);  ey.push_back(a->second.second);
                ex.push_back(b->second.first);  ey.push_back(b->second.second);
                ex.push_back(NAN);               ey.push_back(NAN);
            }
            if (!ex.empty())
                plot.drawCurve(ex, ey).lineColor("gray").lineWidth(1).label("Connections");

            // === 3. Nodes ===
            if (colour && !cluster_map.empty()) {
                // Group nodes by cluster
                std::unordered_map<int, std::vector<size_t>> cluster_groups;
                for (size_t i = 0; i < nodes.size(); ++i) {
                    int cid = cluster_map.count(nodes[i]) ? cluster_map.at(nodes[i]) : 0;
                    cluster_groups[cid].push_back(i);
                }

                std::vector<std::string> colors = {"red", "blue", "green", "purple", "orange", "brown"};
                for (const auto& [cid, indices] : cluster_groups) {
                    std::vector<double> cx, cy;
                    for (size_t i : indices) {
                        cx.push_back(nx[i]);
                        cy.push_back(ny[i]);
                    }
                    auto& pts = plot.drawPoints(cx, cy);
                    pts.pointType(7).pointSize(1.8).lineColor(colors[cid % colors.size()]);
                    if (cid == cluster_groups.begin()->first) pts.label("Nodes");
                }
            } else {
                auto& pts = plot.drawPoints(nx, ny);
                pts.pointType(7).pointSize(1.2).lineColor("red");
                plot.legend().hide();
            }

            // === 4. Node labels ===
            std::string labels;
            for (size_t i = 0; i < nodes.size(); ++i) {
                std::string txt = node_labels.empty() ? nodes[i] : node_labels[i];
                labels += "set label '" + txt + "' at " +
                          std::to_string(nx[i]) + "," + std::to_string(ny[i] + 0.08) +
                          " centre font 'Arial,10' tc rgb 'black'\n";
            }

            // === 5. Clean legend ===
            std::string key = R"(
set key outside right top vertical maxrows 2
set key samplen 2
set key title "Legend"
)";
            plot.gnuplot(cluster_objects + labels + key);

            // === 6. Save ===
            Figure fig{{plot}};
            Canvas canvas{{fig}};
            canvas.size(1200, 900);
            canvas.show();
            canvas.save(outpath);
            std::cout << "Graph saved: " << outpath << "\n";
            std::cin.get();
        }
        catch (const std::exception& e) {
            std::cerr << "[viz] Error: " << e.what() << "\n";
            return false;
        }
        return true;
    }

} // namespace viz