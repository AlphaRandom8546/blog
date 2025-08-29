document.addEventListener('DOMContentLoaded', function() {
    // 获取所有具有 id="copy-email" 的 .news-a 元素
    const emailLinks = document.querySelectorAll('.news-a#copy-email');
    
    // 为每个邮箱链接添加点击事件
    emailLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault(); // 阻止默认链接行为
            
            // 获取邮箱文本内容
            const email = this.textContent;
            
            // 使用 Clipboard API 复制文本
            navigator.clipboard.writeText(email)
                .then(function() {
                    // 复制成功提示
                    const originalText = link.textContent;
                    link.textContent = 'Copied: ' + originalText;
                    
                    // 500毫秒后恢复原始文本
                    setTimeout(function() {
                        link.textContent = originalText;
                    }, 500);
                })
                .catch(function(err) {
                    // 复制失败处理
                    console.error('Failed:', err);
                });
        });
    });
});


// 视频缓存功能
const videoElement = document.getElementById('bg-video');
const videoUrl = './background-video.mp4';

// 检查是否支持 localStorage
function isLocalStorageSupported() {
    try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

// 从 localStorage 加载视频
function loadVideoFromStorage() {
    if (!isLocalStorageSupported()) {
        return false;
    }
    
    const cachedVideoData = localStorage.getItem('cachedBackgroundVideo');
    if (cachedVideoData) {
        try {
            // 解析存储的数据（包含类型和 base64 数据）
            const videoData = JSON.parse(cachedVideoData);
            const byteCharacters = atob(videoData.data.split(',')[1]);
            const byteArrays = [];
            
            for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
                const slice = byteCharacters.slice(offset, offset + 1024);
                const byteNumbers = new Array(slice.length);
                
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                
                byteArrays.push(new Uint8Array(byteNumbers));
            }
            
            const videoBlob = new Blob(byteArrays, { type: videoData.type });
            const videoUrl = URL.createObjectURL(videoBlob);
            
            // 替换视频源
            const sourceElement = videoElement.querySelector('source');
            sourceElement.src = videoUrl;
            videoElement.load();
            
            // 清理之前的 ObjectURL（如果有）
            if (window.cachedVideoObjectUrl) {
                URL.revokeObjectURL(window.cachedVideoObjectUrl);
            }
            window.cachedVideoObjectUrl = videoUrl;
            
            return true;
        } catch (e) {
            console.error('Error loading video from cache:', e);
            localStorage.removeItem('cachedBackgroundVideo');
        }
    }
    return false;
}

// 缓存视频到 localStorage
function cacheVideoToStorage() {
    if (!isLocalStorageSupported()) {
        return;
    }
    
    // 检查是否已经缓存过
    if (localStorage.getItem('cachedBackgroundVideo')) {
        return;
    }
    
    fetch(videoUrl)
        .then(response => response.blob())
        .then(blob => {
            const reader = new FileReader();
            reader.onload = function() {
                try {
                    // 存储类型和 base64 数据
                    const videoData = {
                        type: blob.type,
                        data: reader.result
                    };
                    localStorage.setItem('cachedBackgroundVideo', JSON.stringify(videoData));
                    console.log('Video cached successfully');
                } catch (e) {
                    console.error('Error caching video:', e);
                    // localStorage 可能已满
                    if (e.name === 'QuotaExceededError') {
                        localStorage.removeItem('cachedBackgroundVideo');
                    }
                }
            };
            reader.readAsDataURL(blob);
        })
        .catch(error => {
            console.error('Error fetching video for caching:', error);
        });
}

// 页面加载时尝试从缓存加载视频
document.addEventListener('DOMContentLoaded', () => {
    const isCached = loadVideoFromStorage();
    
    // 如果缓存加载失败或者第一次访问，加载网络视频
    if (!isCached) {
        const sourceElement = videoElement.querySelector('source');
        sourceElement.src = videoUrl;
        videoElement.load();
        
        // 延迟缓存以避免影响主要内容的加载
        setTimeout(cacheVideoToStorage, 3000);
    }
    
    // 确保视频播放
    videoElement.addEventListener('loadeddata', () => {
        videoElement.play().catch(e => {
            console.log('Autoplay prevented, trying with user gesture:', e);
            // 如果自动播放被阻止，等待用户交互后播放
            document.addEventListener('click', function playOnClick() {
                videoElement.play().catch(() => {});
                document.removeEventListener('click', playOnClick);
            }, { once: true });
        });
    });
    
    videoElement.addEventListener('error', (e) => {
        console.error('Video loading error:', e);
        // 如果缓存视频加载失败，回退到网络视频
        if (isCached) {
            localStorage.removeItem('cachedBackgroundVideo');
            const sourceElement = videoElement.querySelector('source');
            sourceElement.src = videoUrl;
            videoElement.load();
        }
    });
});