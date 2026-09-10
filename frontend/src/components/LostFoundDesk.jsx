import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ajaxRequest } from '../utils/ajax';
import {
    Search, PackageSearch, MapPin, User, Clock, Tag,
    Loader2, AlertCircle, SearchX, RefreshCw, X, Inbox
} from 'lucide-react';

// 后端服务地址（与演练场其它接口一致，CORS 已由后端 CorsFilter 开放）
const API_BASE = 'http://localhost:8080/api/lost-found';
// 输入防抖延时：输入停下后才发请求，避免每个字都打一次接口
const DEBOUNCE_MS = 350;

/**
 * 校园失物服务台 —— 关键词搜索
 *
 * 关键实现点：
 * 1. 关键词拼进查询参数前用 encodeURIComponent 做 UTF-8 百分号编码，
 *    "雨伞" -> %E9%9B%A8%E4%BC%9E，后端按 UTF-8 解码，杜绝中文乱码；
 * 2. 使用封装好的 ajaxRequest（fetch + AbortController 超时控制）发异步请求；
 * 3. 搜索中显示骨架/加载状态，无结果时给出清晰提示，网络错误可重试；
 * 4. 防抖 + 请求序号，避免“后发先至”导致结果错乱。
 */
function LostFoundDesk() {
    const [keyword, setKeyword] = useState('');          // 输入框内容
    const [items, setItems] = useState([]);              // 失物列表
    const [loading, setLoading] = useState(false);       // 加载状态
    const [error, setError] = useState('');              // 错误信息
    const [hasSearched, setHasSearched] = useState(false); // 是否完成过一次请求
    const [submittedKeyword, setSubmittedKeyword] = useState(''); // 实际查询用的词（用于空结果提示）

    // 请求序号：只接受最后一次请求的结果，防止旧响应覆盖新结果
    const requestSeqRef = useRef(0);
    // 输入框引用，便于搜索按钮/回车触发
    const inputRef = useRef(null);
    // 跳过防抖 effect 的首次执行：首屏已由挂载 effect 立即加载，无需重复请求
    const skipFirstDebounceRef = useRef(true);

    /**
     * 发送搜索请求。
     * @param {string} kw 关键词（空字符串表示加载全部失物）
     */
    const doSearch = useCallback((kw) => {
        const trimmed = kw.trim();
        const seq = ++requestSeqRef.current;
        setLoading(true);
        setError('');

        // 中文及特殊字符必须编码：encodeURIComponent 输出 UTF-8 百分号序列
        const url = `${API_BASE}?keyword=${encodeURIComponent(trimmed)}`;

        ajaxRequest({
            url,
            method: 'GET',
            timeout: 8000,
            // GET 请求不带 JSON body；使用默认的 application/json 头也不影响查询参数解析
            onLoading: () => { }, // 加载状态由本组件自行管理
            onSuccess: (res) => {
                // 过期响应直接丢弃（用户已继续输入）
                if (seq !== requestSeqRef.current) return;
                const data = res.data || {};
                setItems(Array.isArray(data.items) ? data.items : []);
                setSubmittedKeyword(typeof data.keyword === 'string' ? data.keyword : trimmed);
                setHasSearched(true);
                setLoading(false);
            },
            onError: (err) => {
                if (seq !== requestSeqRef.current) return;
                const msg = err.code === 0
                    ? '网络异常或请求超时，请检查后端服务（localhost:8080）是否启动。'
                    : `搜索失败（${err.code || '未知错误'}），请稍后重试。`;
                setError(msg);
                setItems([]);
                setHasSearched(true);
                setLoading(false);
            }
        });
    }, []);

    // 初次挂载：加载全部失物
    useEffect(() => {
        doSearch('');
        inputRef.current?.focus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 防抖：输入变化后延时自动搜索（首次执行跳过，避免与挂载加载重复）
    useEffect(() => {
        if (skipFirstDebounceRef.current) {
            skipFirstDebounceRef.current = false;
            return;
        }
        const timer = setTimeout(() => {
            doSearch(keyword);
        }, DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [keyword, doSearch]);

    const handleSubmit = (e) => {
        e.preventDefault();
        doSearch(keyword);
    };

    const handleClear = () => {
        setKeyword('');
        // 清空后由防抖 effect 自动发起“查看全部”的请求
        inputRef.current?.focus();
    };

    const quickKeywords = ['雨伞', '校园卡', '张伟', '图书馆'];

    return (
        <div className="flex flex-col h-full gap-4 p-5 overflow-hidden">
            {/* 标题区 */}
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
                    <PackageSearch className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white">校园失物服务台</h2>
                    <p className="text-xs text-slate-400">
                        输入物品名（如“雨伞”）、类别（如“校园卡”）或拾取人中文姓名进行搜索
                    </p>
                </div>
            </div>

            {/* 搜索框 */}
            <form onSubmit={handleSubmit} className="relative">
                <div className={`flex items-center gap-2 bg-slate-950 border rounded-xl px-3 py-2.5 transition-colors ${error ? 'border-red-700' : 'border-slate-700 focus-within:border-blue-500'}`}>
                    {loading ? (
                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
                    ) : (
                        <Search className="w-5 h-5 text-slate-500 shrink-0" />
                    )}
                    <input
                        ref={inputRef}
                        type="search"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="搜索失物：雨伞 / 校园卡 / 姓名（如 张伟）"
                        className="flex-1 bg-transparent outline-none text-sm text-slate-100 placeholder-slate-600"
                        aria-label="失物关键词搜索"
                        autoComplete="off"
                    />
                    {keyword && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-slate-500 hover:text-slate-300 transition shrink-0"
                            title="清空关键词"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition shrink-0"
                    >
                        搜索
                    </button>
                </div>

                {/* 快捷关键词 */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-slate-500">快捷搜索：</span>
                    {quickKeywords.map((kw) => (
                        <button
                            key={kw}
                            type="button"
                            onClick={() => setKeyword(kw)}
                            className={`px-2.5 py-0.5 text-xs rounded-full border transition ${
                                keyword === kw
                                    ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-blue-600 hover:text-blue-300'
                            }`}
                        >
                            {kw}
                        </button>
                    ))}
                </div>
            </form>

            {/* 结果统计条 */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1 min-h-[20px]">
                {loading ? (
                    <span className="text-blue-400 flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> 正在搜索{keyword.trim() ? `“${keyword.trim()}”` : '全部失物'}…
                    </span>
                ) : error ? (
                    <span />
                ) : hasSearched ? (
                    <span>
                        {submittedKeyword ? (
                            <>关键词 <b className="text-slate-300">“{submittedKeyword}”</b> 共匹配 <b className="text-blue-400">{items.length}</b> 条记录</>
                        ) : (
                            <>当前共有 <b className="text-blue-400">{items.length}</b> 件待认领失物</>
                        )}
                    </span>
                ) : (
                    <span />
                )}
            </div>

            {/* 结果区域 */}
            <div className="flex-1 overflow-y-auto pr-1 -mr-1">
                {/* 加载中：骨架卡片 */}
                {loading && (
                    <div className="grid gap-3">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse">
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex-1 space-y-2.5">
                                        <div className="h-4 bg-slate-800 rounded w-1/3" />
                                        <div className="h-3 bg-slate-800/70 rounded w-2/3" />
                                        <div className="h-3 bg-slate-800/50 rounded w-1/2" />
                                    </div>
                                    <div className="w-12 h-6 bg-slate-800 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 错误状态 */}
                {!loading && error && (
                    <div className="h-full min-h-[280px] flex flex-col items-center justify-center gap-3 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-900/20 border border-red-800/60 flex items-center justify-center">
                            <AlertCircle className="w-7 h-7 text-red-400" />
                        </div>
                        <p className="text-sm text-red-300 max-w-sm">{error}</p>
                        <button
                            onClick={() => doSearch(keyword)}
                            className="mt-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-200 flex items-center gap-2 transition"
                        >
                            <RefreshCw className="w-4 h-4" /> 重新搜索
                        </button>
                    </div>
                )}

                {/* 空结果状态 */}
                {!loading && !error && hasSearched && items.length === 0 && (
                    <div className="h-full min-h-[280px] flex flex-col items-center justify-center gap-3 text-center">
                        <div className="w-14 h-14 rounded-full bg-slate-800/60 border border-slate-700 flex items-center justify-center">
                            <SearchX className="w-7 h-7 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-300 font-medium">
                                没有找到与“{submittedKeyword}”相关的失物
                            </p>
                            <p className="text-xs text-slate-500 mt-1.5">
                                请检查关键词是否正确，或尝试更换物品名称、类别（如“雨伞”“校园卡”）、拾取地点或姓名
                            </p>
                        </div>
                        <button
                            onClick={handleClear}
                            className="mt-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition"
                        >
                            查看全部失物
                        </button>
                    </div>
                )}

                {/* 尚未完成首次请求（理论上挂载即请求，此为兜底） */}
                {!loading && !error && !hasSearched && (
                    <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-slate-600 gap-3">
                        <Inbox className="w-10 h-10 opacity-40" />
                        <p className="text-sm">准备加载失物列表…</p>
                    </div>
                )}

                {/* 结果列表 */}
                {!loading && !error && items.length > 0 && (
                    <div className="grid gap-3 pb-2">
                        {items.map((item) => (
                            <article
                                key={item.id}
                                className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition-colors"
                            >
                                <div className="flex justify-between items-start gap-3">
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2 flex-wrap">
                                            {item.name}
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-900/40 border border-blue-800/60 text-blue-300 text-[11px] font-normal">
                                                <Tag className="w-3 h-3" /> {item.category}
                                            </span>
                                        </h3>
                                        <dl className="mt-2 grid gap-1.5 text-xs text-slate-400">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                <dt className="sr-only">拾取地点</dt>
                                                <dd>{item.location}</dd>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                <dt className="sr-only">拾取人</dt>
                                                <dd>拾取人：{item.finderName}</dd>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                                <dt className="sr-only">拾取时间</dt>
                                                <dd>{item.foundTime}</dd>
                                            </div>
                                            {item.remark && (
                                                <p className="text-[11px] text-slate-500 mt-0.5 pl-5">
                                                    备注：{item.remark}
                                                </p>
                                            )}
                                        </dl>
                                    </div>
                                    <span className="shrink-0 px-2.5 py-1 rounded-full bg-amber-900/30 border border-amber-800/50 text-amber-300 text-[11px] whitespace-nowrap">
                                        {item.status}
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default LostFoundDesk;
