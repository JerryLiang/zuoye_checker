"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportApi = void 0;
const http_1 = require("./http");
exports.reportApi = {
    weekly(childId, startDate) {
        return http_1.http.get('/reports/weekly', { child_id: childId, start_date: startDate });
    },
};
