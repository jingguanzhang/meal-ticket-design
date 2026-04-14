/**
 * 9-Slice SVG 生成器类
 * 输入：SVG 路径 URL
 * 输出：高清 PNG Base64
 */
class SvgBorderGenerator {
    constructor() {}

    /**
     * 从 SVG URL 异步生成 9-slice PNG Base64
     * @param {string} svgUrl - SVG 文件的 URL
     * @param {number} srcW - 原始 SVG 宽度
     * @param {number} srcH - 原始 SVG 高度
     * @param {object} target - 目标尺寸 { width, height }
     * @param {object} slice - 切片参数 { top, right, bottom, left }
     * @param {string} mode - 'stretch' | 'repeat'
     * @param {string|null} color - 强制上色颜色值 (e.g. '#ff0000')，null 则不开启
     * @param {number} scale - 输出放大倍数，用于生成高清图像 (默认 2)
     * @returns {Promise<string>} PNG Base64 字符串
     */
    async generateFromSVG(svgUrl, srcW, srcH, target, slice, mode = 'stretch', color = null, scale = 2) {
        try {
            // 1. 加载 SVG 内容
            const svgContent = await this.loadSVGContent(svgUrl);
            
            // 2. 生成 9-slice SVG
            const slicedSVG = this.generate(svgContent, srcW, srcH, target, slice, mode, color);
            
            // 3. 转换为高清 PNG
            return await this.svgToPNG(slicedSVG, target.width, target.height, scale);
        } catch (error) {
            throw new Error('SVG 处理失败: ' + error.message);
        }
    }

    /**
     * 加载 SVG 文件内容
     * @param {string} svgUrl - SVG URL
     * @returns {Promise<string>} SVG 文本内容
     */
    async loadSVGContent(svgUrl) {
        return new Promise((resolve, reject) => {
            fetch(svgUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    return response.text();
                })
                .then(svgText => {
                    // 验证是否为有效的 SVG
                    if (!svgText.trim().startsWith('<svg') && !svgText.includes('<svg')) {
                        throw new Error('不是有效的 SVG 文件');
                    }
                    resolve(svgText);
                })
                .catch(error => {
                    reject(new Error('SVG 加载失败: ' + error.message));
                });
        });
    }

    /**
     * 生成 9-slice SVG 字符串
     * @param {string} svgContent - SVG 文本内容
     * @param {number} srcW - 原始 SVG 宽度
     * @param {number} srcH - 原始 SVG 高度
     * @param {object} target - { width, height }
     * @param {object} slice - { top, right, bottom, left }
     * @param {string} mode - 'stretch' | 'repeat'
     * @param {string|null} color - 强制上色颜色值
     */
    generate(svgContent, srcW, srcH, target, slice, mode = 'stretch', color = null) {
        const { top: T, right: R, bottom: B, left: L } = slice;
        const { width: tW, height: tH } = target;

        // 原始图片的中心部分尺寸
        const srcCW = srcW - L - R;
        const srcCH = srcH - T - B;

        // 目标图片的中心部分尺寸
        const targetCW = tW - L - R;
        const targetCH = tH - T - B;

        // 定义唯一的ID前缀，防止页面上多个SVG冲突
        const uid = 'border_' + Math.random().toString(36).substr(2, 9);

        // 将原始 SVG 转换为 Data URI
        const svgDataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));

        // 构建 SVG 头部
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tW}" height="${tH}" viewBox="0 0 ${tW} ${tH}">`;
        
        // 定义部分：包含滤镜、原始图片和 Pattern
        svg += `<defs>`;

        // 如果启用了上色，定义 filter
        let filterAttr = '';
        if (color) {
            svg += `
            <filter id="${uid}_tint">
                <feFlood flood-color="${color}" result="flood" />
                <feComposite operator="in" in="flood" in2="SourceGraphic" />
            </filter>`;
            filterAttr = `filter="url(#${uid}_tint)"`;
        }

        // 定义基础 Image (使用 SVG Data URI)
        svg += `<image id="${uid}_img" href="${svgDataUri}" width="${srcW}" height="${srcH}" ${filterAttr} />`;

        // 如果是平铺模式，需要定义 Pattern
        if (mode === 'repeat') {
            // Top Edge Pattern
            svg += `<pattern id="${uid}_p_top" x="${L}" y="0" width="${srcCW}" height="${T}" patternUnits="userSpaceOnUse">
                        <svg x="0" y="0" width="${srcCW}" height="${T}" viewBox="${L} 0 ${srcCW} ${T}">
                            <use href="#${uid}_img" />
                        </svg>
                    </pattern>`;
            
            // Bottom Edge Pattern
            svg += `<pattern id="${uid}_p_bottom" x="${L}" y="${tH - B}" width="${srcCW}" height="${B}" patternUnits="userSpaceOnUse">
                        <svg x="0" y="0" width="${srcCW}" height="${B}" viewBox="${L} ${srcH - B} ${srcCW} ${B}">
                            <use href="#${uid}_img" />
                        </svg>
                    </pattern>`;
            
            // Left Edge Pattern
            svg += `<pattern id="${uid}_p_left" x="0" y="${T}" width="${L}" height="${srcCH}" patternUnits="userSpaceOnUse">
                        <svg x="0" y="0" width="${L}" height="${srcCH}" viewBox="0 ${T} ${L} ${srcCH}">
                            <use href="#${uid}_img" />
                        </svg>
                    </pattern>`;
            
            // Right Edge Pattern
            svg += `<pattern id="${uid}_p_right" x="${tW - R}" y="${T}" width="${R}" height="${srcCH}" patternUnits="userSpaceOnUse">
                        <svg x="0" y="0" width="${R}" height="${srcCH}" viewBox="${srcW - R} ${T} ${R} ${srcCH}">
                            <use href="#${uid}_img" />
                        </svg>
                    </pattern>`;
            
            // Center Pattern
            svg += `<pattern id="${uid}_p_center" x="${L}" y="${T}" width="${srcCW}" height="${srcCH}" patternUnits="userSpaceOnUse">
                        <svg x="0" y="0" width="${srcCW}" height="${srcCH}" viewBox="${L} ${T} ${srcCW} ${srcCH}">
                            <use href="#${uid}_img" />
                        </svg>
                    </pattern>`;
        }
        svg += `</defs>`;

        // === 绘制 9 个部分 ===

        // 1-4: 四个角 (始终不拉伸)
        svg += `<svg x="0" y="0" width="${L}" height="${T}" viewBox="0 0 ${L} ${T}">
                    <use href="#${uid}_img" />
                </svg>`;
        svg += `<svg x="${tW - R}" y="0" width="${R}" height="${T}" viewBox="${srcW - R} 0 ${R} ${T}">
                    <use href="#${uid}_img" />
                </svg>`;
        svg += `<svg x="0" y="${tH - B}" width="${L}" height="${B}" viewBox="0 ${srcH - B} ${L} ${B}">
                    <use href="#${uid}_img" />
                </svg>`;
        svg += `<svg x="${tW - R}" y="${tH - B}" width="${R}" height="${B}" viewBox="${srcW - R} ${srcH - B} ${R} ${B}">
                    <use href="#${uid}_img" />
                </svg>`;

        // === 边缘和中心处理 ===
        if (mode === 'stretch') {
            svg += `<svg x="${L}" y="0" width="${targetCW}" height="${T}" viewBox="${L} 0 ${srcCW} ${T}" preserveAspectRatio="none">
                        <use href="#${uid}_img" />
                    </svg>`;
            svg += `<svg x="${L}" y="${tH - B}" width="${targetCW}" height="${B}" viewBox="${L} ${srcH - B} ${srcCW} ${B}" preserveAspectRatio="none">
                        <use href="#${uid}_img" />
                    </svg>`;
            svg += `<svg x="0" y="${T}" width="${L}" height="${targetCH}" viewBox="0 ${T} ${L} ${srcCH}" preserveAspectRatio="none">
                        <use href="#${uid}_img" />
                    </svg>`;
            svg += `<svg x="${tW - R}" y="${T}" width="${R}" height="${targetCH}" viewBox="${srcW - R} ${T} ${R} ${srcCH}" preserveAspectRatio="none">
                        <use href="#${uid}_img" />
                    </svg>`;
            svg += `<svg x="${L}" y="${T}" width="${targetCW}" height="${targetCH}" viewBox="${L} ${T} ${srcCW} ${srcCH}" preserveAspectRatio="none">
                        <use href="#${uid}_img" />
                    </svg>`;
        } else {
            svg += `<rect x="${L}" y="0" width="${targetCW}" height="${T}" fill="url(#${uid}_p_top)" />`;
            svg += `<rect x="${L}" y="${tH - B}" width="${targetCW}" height="${B}" fill="url(#${uid}_p_bottom)" />`;
            svg += `<rect x="0" y="${T}" width="${L}" height="${targetCH}" fill="url(#${uid}_p_left)" />`;
            svg += `<rect x="${tW - R}" y="${T}" width="${R}" height="${targetCH}" fill="url(#${uid}_p_right)" />`;
            svg += `<rect x="${L}" y="${T}" width="${targetCW}" height="${targetCH}" fill="url(#${uid}_p_center)" />`;
        }

        svg += `</svg>`;
        return svg;
    }

    /**
     * 将 SVG 字符串转换为 PNG Base64
     * @param {string} svgString - SVG 字符串
     * @param {number} width - 目标宽度
     * @param {number} height - 目标高度
     * @param {number} scale - 放大倍数
     * @returns {Promise<string>} PNG Base64 字符串
     */
    async svgToPNG(svgString, width, height, scale = 2) {
        return new Promise((resolve, reject) => {
            // 创建离屏 Canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 设置高清尺寸
            canvas.width = width * scale;
            canvas.height = height * scale;

            // 创建 Image 对象
            const img = new Image();
            
            // SVG 需要编码为 Data URI
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                // 绘制到 Canvas (高清渲染)
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // 转换为 PNG Base64
                const pngBase64 = canvas.toDataURL('image/png');
                
                // 清理
                URL.revokeObjectURL(url);
                
                resolve(pngBase64);
            };

            img.onerror = (error) => {
                URL.revokeObjectURL(url);
                reject(new Error('SVG 渲染失败: ' + error));
            };

            img.src = url;
        });
    }
}