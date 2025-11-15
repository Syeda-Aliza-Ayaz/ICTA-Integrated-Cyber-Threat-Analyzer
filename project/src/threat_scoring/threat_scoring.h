#pragma once
#include <string>
#include <vector>
#include <queue>
#include <iostream>
#include "../ioc_search/ioc_search.h"  // so it can use IoCRecord

struct CompareThreat {
    bool operator()(const IoCRecord& a, const IoCRecord& b) const {
        return a.score < b.score; // Max-heap: higher score = higher priority
    }
};

class ThreatScoring {
public:
    static void assignScores(std::vector<IoCRecord>& data) {
        for (auto& r : data) {
            if (r.severity == "Critical") r.score = 5;
            else if (r.severity == "High") r.score = 4;
            else if (r.severity == "Medium") r.score = 3;
            else if (r.severity == "Low") r.score = 2;
            else r.score = 1;
        }
    }

    static void showTopThreats(const std::vector<IoCRecord>& data, int topN) {
        std::priority_queue<IoCRecord, std::vector<IoCRecord>, CompareThreat> heap(data.begin(), data.end());

        std::cout << "\n🔥 Top " << topN << " Threats:\n";
        for (int i = 0; i < topN && !heap.empty(); ++i) {
            IoCRecord top = heap.top();
            heap.pop();
            std::cout << i + 1 << ". [" << top.severity << "] "
                      << top.ioc << " → " << top.threat
                      << " (" << top.source << ")\n";
        }
    }
};
