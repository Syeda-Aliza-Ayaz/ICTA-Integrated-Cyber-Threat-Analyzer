// src/priority_queue/priority_queue.cpp
#include "priority_queue.h"
#include <algorithm>
#include <stdexcept>

void MinHeap::heapifyUp(int idx)
{
    while (idx > 0)
    {
        int parent = (idx - 1) / 2;
        if (heap[idx] < heap[parent])
        {
            std::swap(heap[idx], heap[parent]);
            idx = parent;
        }
        else
        {
            break;
        }
    }
}

void MinHeap::heapifyDown(int idx)
{
    int size = heap.size();
    while (true)
    {
        int smallest = idx;
        int left = 2 * idx + 1;
        int right = 2 * idx + 2;

        if (left < size && heap[left] < heap[smallest])
            smallest = left;
        if (right < size && heap[right] < heap[smallest])
            smallest = right;

        if (smallest != idx)
        {
            std::swap(heap[idx], heap[smallest]);
            idx = smallest;
        }
        else
        {
            break;
        }
    }
}

void MinHeap::push(const Threat &t)
{
    heap.push_back(t);
    heapifyUp(heap.size() - 1);
}

Threat MinHeap::pop()
{
    if (heap.empty())
        throw std::out_of_range("Heap empty");
    Threat root = heap[0];
    heap[0] = heap.back();
    heap.pop_back();
    if (!heap.empty())
        heapifyDown(0);
    return root;
}

// std::vector<Threat> MinHeap::getTopK(int k)
// {
//     std::vector<Threat> result;
//     std::vector<Threat> temp = heap;
//     MinHeap copy;
//     copy.heap = std::move(temp);

//     for (int i = 0; i < k && !copy.empty(); ++i)
//     {
//         result.push_back(copy.pop());
//     }
//     std::reverse(result.begin(), result.end()); // Return highest first
//     return result;
// }
std::vector<Threat> MinHeap::getTopK(int k)
{
    if (heap.empty()) return {};

    std::vector<Threat> result = heap;
    k = std::min(k, (int)result.size());

    std::partial_sort(
        result.begin(),
        result.begin() + k,
        result.end(),
        [](const Threat& a, const Threat& b) {
            return a.score > b.score;  // Highest first
        }
    );

    result.resize(k);
    return result;
}
void MinHeap::clear()
{
    heap.clear();
}