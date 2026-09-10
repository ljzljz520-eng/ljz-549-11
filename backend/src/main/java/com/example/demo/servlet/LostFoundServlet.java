package com.example.demo.servlet;

import com.google.gson.Gson;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 校园失物服务台 —— 关键词搜索接口。
 *
 * GET /api/lost-found?keyword=雨伞
 *
 * 关键词可同时匹配：物品名称、物品类别、拾取地点、拾取人中文姓名。
 * 不带 keyword（或为空）时返回全部失物，便于页面初次加载展示。
 *
 * 中文编码说明（重点）：
 * - 前端使用 encodeURIComponent 按 UTF-8 编码查询参数；
 * - 现代容器（Jetty 11 / Tomcat 10）默认按 UTF-8 解析 query string，
 *   再配合 EncodingFilter 中 request.setCharacterEncoding("UTF-8") 即可正常；
 * - 为兼容少数仍以 ISO-8859-1 解析 query string 的老环境，
 *   这里不直接用可能已被错误解码的 req.getParameter，
 *   而是自行解析 req.getQueryString()，按 UTF-8 解码，双保险杜绝中文乱码。
 */
@WebServlet("/api/lost-found")
public class LostFoundServlet extends HttpServlet {

    private final Gson gson = new Gson();

    /** 模拟失物招领数据库（实际项目中应来自数据库查询）。 */
    private static final List<Map<String, Object>> LOST_ITEMS = new ArrayList<>();

    static {
        LOST_ITEMS.add(item(1, "黑色折叠雨伞", "雨伞", "图书馆二楼自习区", "张伟", "2026-09-08 14:20", "伞骨处有轻微划痕"));
        LOST_ITEMS.add(item(2, "蓝色长柄雨伞", "雨伞", "第一教学楼 103 教室", "李娜", "2026-09-09 08:50", "伞柄挂有小熊挂件"));
        LOST_ITEMS.add(item(3, "学生校园卡", "校园卡", "东区食堂三楼窗口", "王芳", "2026-09-09 12:10", "卡面贴有星星贴纸"));
        LOST_ITEMS.add(item(4, "教师校园卡", "校园卡", "行政楼一层大厅", "刘洋", "2026-09-07 17:30", "挂蓝色卡套"));
        LOST_ITEMS.add(item(5, "校园卡（无卡套）", "校园卡", "体育馆篮球场", "陈静", "2026-09-10 09:05", "卡面有磨损，卡号末四位 2333"));
        LOST_ITEMS.add(item(6, "银色无线耳机", "电子产品", "图书馆四楼研讨间", "杨帆", "2026-09-08 20:40", "充电盒有刻字 'Y.F'"));
        LOST_ITEMS.add(item(7, "黑色双肩书包", "书包", "第二教学楼 305 教室", "赵磊", "2026-09-06 16:00", "内有高数教材一本"));
        LOST_ITEMS.add(item(8, "透明保温杯", "水杯", "实验楼 B207", "黄敏", "2026-09-09 10:30", "杯底贴有名字标签"));
        LOST_ITEMS.add(item(9, "黑色钱包", "钱包证件", "校医院挂号处", "周杰", "2026-09-05 11:15", "内有身份证与若干现金"));
        LOST_ITEMS.add(item(10, "白色充电宝", "电子产品", "南区操场看台", "吴婷", "2026-09-10 07:50", "容量 20000mAh"));
        LOST_ITEMS.add(item(11, "粉色自动雨伞", "雨伞", "女生宿舍 6 号楼楼下", "郑爽", "2026-09-09 21:05", "伞套完好"));
        LOST_ITEMS.add(item(12, "近视眼镜", "眼镜", "图书馆三楼借阅区", "孙强", "2026-09-08 15:45", "黑框，放在黑色眼镜盒内"));
    }

    private static Map<String, Object> item(int id, String name, String category,
                                            String location, String finder,
                                            String foundTime, String remark) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("name", name);
        m.put("category", category);
        m.put("location", location);
        m.put("finderName", finder);
        m.put("foundTime", foundTime);
        m.put("remark", remark);
        m.put("status", "待认领");
        return m;
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        // 模拟真实网络与查询耗时，让前端加载状态可见
        try {
            Thread.sleep(400);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // 自行按 UTF-8 解析查询串，彻底规避容器默认编码差异导致的中文乱码
        String keyword = getUtf8Parameter(req, "keyword");
        if (keyword != null) {
            keyword = keyword.trim();
        }
        boolean hasKeyword = keyword != null && !keyword.isEmpty();
        String normalizedKeyword = hasKeyword ? keyword.toLowerCase() : "";

        List<Map<String, Object>> matched = new ArrayList<>();
        if (hasKeyword) {
            for (Map<String, Object> item : LOST_ITEMS) {
                if (containsIgnoreCase(item.get("name"), normalizedKeyword)
                        || containsIgnoreCase(item.get("category"), normalizedKeyword)
                        || containsIgnoreCase(item.get("location"), normalizedKeyword)
                        || containsIgnoreCase(item.get("finderName"), normalizedKeyword)
                        || containsIgnoreCase(item.get("remark"), normalizedKeyword)) {
                    matched.add(item);
                }
            }
        } else {
            matched.addAll(LOST_ITEMS);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("keyword", hasKeyword ? keyword : "");
        result.put("total", matched.size());
        result.put("items", matched);
        result.put("timestamp", System.currentTimeMillis());

        resp.setStatus(HttpServletResponse.SC_OK);
        resp.getWriter().write(gson.toJson(result));
    }

    private boolean containsIgnoreCase(Object field, String keywordLower) {
        return field != null && field.toString().toLowerCase().contains(keywordLower);
    }

    /**
     * 从 query string 中按 UTF-8 解码指定参数。
     * 不使用 req.getParameter：部分容器对 query string 默认使用 ISO-8859-1，
     * 直接 getParameter 拿到的中文可能已经是乱码（且无法可靠还原）。
     */
    private String getUtf8Parameter(HttpServletRequest req, String name) {
        String query = req.getQueryString();
        if (query == null || query.isEmpty()) {
            return null;
        }
        for (String pair : query.split("&")) {
            int eq = pair.indexOf('=');
            String key = eq >= 0 ? pair.substring(0, eq) : pair;
            String decodedKey = URLDecoder.decode(key, StandardCharsets.UTF_8);
            if (decodedKey.equals(name)) {
                if (eq < 0) {
                    return "";
                }
                return URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
            }
        }
        return null;
    }
}
