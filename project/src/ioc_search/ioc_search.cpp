#include "ioc_search.h"
#include <fstream>
#include <iostream>
#include "nlohmann/json.hpp"

using json = nlohmann::json;

bool IoCSearch::loadFromJSON(const std::string& filePath) {
    std::ifstream file(filePath);
    if (!file.is_open()) {
        std::cerr << "❌ Error: Unable to open file " << filePath << std::endl;
        return false;
    }

    json data;
    try {
        file >> data;
    } catch (const std::exception& e) {
        std::cerr << "❌ JSON parsing error: " << e.what() << std::endl;
        return false;
    }

    records.clear();
    iocMap.clear();

    for (const auto& item : data) {
        IoCRecord record;
        record.ioc = item.value("ioc", "");
        record.type = item.value("type", "");
        record.threat = item.value("threat", "Unknown");
        record.severity = item.value("severity", "Unknown");
        record.source = item.value("source", "Unknown");

        // ✅ Load related IoCs if present
        if (item.contains("relatedIoCs") && item["relatedIoCs"].is_array()) {
            for (const auto& rel : item["relatedIoCs"]) {
                record.relatedIoCs.push_back(rel.get<std::string>());
            }
        }

        record.computeScore();
        records.push_back(record);
        iocMap[record.ioc] = record;
    }

    if (records.empty()) {
        std::cout << "⚠️ No IoCs found in file.\n";
        return false;
    }

    std::cout << "✅ Loaded " << records.size() << " IoC records successfully.\n";
    return true;
}


IoCRecord *IoCSearch::searchIoC(const std::string &query)
{
    auto it = iocMap.find(query);
    if (it != iocMap.end())
    {
        return &it->second;
    }
    return nullptr;
}

void IoCSearch::displayRecord(const IoCRecord &record)
{
    std::cout << "\n🔍 IoC Found!" << std::endl;
    std::cout << "---------------------------------" << std::endl;
    std::cout << "IoC: " << record.ioc << std::endl;
    std::cout << "Type: " << record.type << std::endl;
    std::cout << "Threat: " << record.threat << std::endl;
    std::cout << "Severity: " << record.severity << std::endl;
    std::cout << "Source: " << record.source << std::endl;
    std::cout << "---------------------------------" << std::endl;
}
