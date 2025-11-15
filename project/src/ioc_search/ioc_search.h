#ifndef IOC_SEARCH_H
#define IOC_SEARCH_H

#include <string>
#include <unordered_map>
#include <vector>
#include "nlohmann/json.hpp"

struct IoCRecord {
    std::string ioc;              // Indicator value
    std::string type;             // Type (IP, Domain, MD5, etc.)
    std::string threat;           // Description of threat
    std::string severity;         // Critical, High, Medium, Low
    std::string source;           // Source of intel (AlienVault, etc.)
    int score;                    // Numeric threat score
    std::vector<std::string> relatedIoCs;  // ✅ Added: related IoCs

    IoCRecord() : score(0) {}

    // void computeScore() {
    //     if (severity == "Critical") score = 5;
    //     else if (severity == "High") score = 4;
    //     else if (severity == "Medium") score = 3;
    //     else if (severity == "Low") score = 2;
    //     else score = 1;
    // }
    void computeScore() {
        if (severity == "HIGH") score = 90;
        else if (severity == "MEDIUM") score = 70;
        else score = 50;
        score += relatedIoCs.size() * 5;
        if (score > 100) score = 100;
    }

    std::string toJSON() const {
        nlohmann::json j = {
            {"ioc", ioc},
            {"type", type},
            {"threat", threat},
            {"severity", severity},
            {"score", score},
            {"relatedIoCs", relatedIoCs}
        };
        return j.dump();
    }
};

class IoCSearch {
private:
    std::unordered_map<std::string, IoCRecord> iocMap;
    std::vector<IoCRecord> records;

public:
    std::vector<IoCRecord>& getData() {
        return records;
    }

    bool loadFromJSON(const std::string& filePath);
    IoCRecord* searchIoC(const std::string& query);
    void displayRecord(const IoCRecord& record);
};

#endif
