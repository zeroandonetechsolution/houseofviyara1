let supabaseClient = null;
let filesToUpload = [];
let uploadedFilesList = [];

// Open preview modal
async function openPreview(content, file) {
    const modal = document.getElementById('previewModal');
    const body = document.getElementById('previewModalBody');
    
    if (content) {
        body.innerHTML = content;
    } else if (file) {
        // Create preview from file
        body.innerHTML = '<div style="padding: 3rem; text-align: center;"><i class="fas fa-spinner fa-spin fa-3x" style="color: #d4a75c;"></i><p style="margin-top: 1rem;">Loading preview...</p></div>';
        try {
            const previewHtml = await createPreviewContent(file);
            body.innerHTML = previewHtml;
        } catch (err) {
            console.error('Preview failed', err);
            const { icon, color } = getFileTypeInfo(file);
            const url = file instanceof File ? URL.createObjectURL(file) : file.url;
            body.innerHTML = `
                <div class="preview-fallback">
                    <i class="fas ${icon}" style="color: ${color}"></i>
                    <h3>${file.name}</h3>
                    <p>Preview failed to load</p>
                    <a href="${url}" target="_blank" class="upload-btn">
                        <i class="fas fa-download"></i>
                        Download File
                    </a>
                </div>
            `;
        }
    }
    
    modal.classList.add('show');
}

// Close preview modal
function closePreview() {
    const modal = document.getElementById('previewModal');
    modal.classList.remove('show');
}

// Convert HEIC to blob for preview
async function convertHeicForPreview(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const decoder = new window.libheif.HeifDecoder();
                const images = decoder.decode(new Uint8Array(reader.result));
                if (!images || images.length === 0) {
                    reject(new Error('No image in HEIC file'));
                    return;
                }
                
                const image = images[0];
                const width = image.get_width();
                const height = image.get_height();
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                
                const rgbaData = new Uint8ClampedArray(width * height * 4);
                image.display(rgbaData, (result) => {
                    if (result === window.libheif.heif_error_code.Ok) {
                        const imgData = new ImageData(rgbaData, width, height);
                        ctx.putImageData(imgData, 0, 0);
                        canvas.toBlob(resolve, 'image/jpeg', 0.9);
                    } else {
                        reject(new Error('HEIC decode failed'));
                    }
                });
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

// Create preview content HTML
async function createPreviewContent(fileOrUrl) {
    let file, url, name;
    if (fileOrUrl instanceof File) {
        file = fileOrUrl;
        name = file.name;
        const ext = name.split('.').pop().toLowerCase();
        
        // Handle HEIC/HEIF files specially
        if (['heic', 'heif'].includes(ext) && typeof window.libheif !== 'undefined') {
            try {
                const convertedBlob = await convertHeicForPreview(file);
                const convertedUrl = URL.createObjectURL(convertedBlob);
                return `<img src="${convertedUrl}" alt="${name}" />`;
            } catch (err) {
                console.warn('HEIC preview conversion failed', err);
            }
        }
        
        url = URL.createObjectURL(file);
    } else {
        url = fileOrUrl.url;
        name = fileOrUrl.name;
    }
    
    const ext = name.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif'];
    const videoExts = ['mp4', 'webm', 'ogg'];
    const audioExts = ['mp3', 'wav', 'ogg', 'aac'];
    const pdfExts = ['pdf'];
    
    if (imageExts.includes(ext)) {
        return `<img src="${url}" alt="${name}" />`;
    } else if (videoExts.includes(ext)) {
        return `<video src="${url}" controls></video>`;
    } else if (audioExts.includes(ext)) {
        return `<audio src="${url}" controls></audio>`;
    } else if (pdfExts.includes(ext)) {
        return `<iframe src="${url}"></iframe>`;
    } else {
        const { icon, color } = getFileTypeInfo({ name });
        return `
            <div class="preview-fallback">
                <i class="fas ${icon}" style="color: ${color}"></i>
                <h3>${name}</h3>
                <p>Preview not available for this file type</p>
                <a href="${url}" target="_blank" class="upload-btn">
                    <i class="fas fa-download"></i>
                    Download File
                </a>
            </div>
        `;
    }
}

// Get file icon/color based on type
function getFileTypeInfo(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic', 'heif'];
    const pdfExts = ['pdf'];
    const docExts = ['doc', 'docx', 'odt'];
    const xlsExts = ['xls', 'xlsx', 'ods'];
    const zipExts = ['zip', 'rar', '7z'];
    const videoExts = ['mp4', 'webm', 'avi', 'mov', 'mkv'];
    const audioExts = ['mp3', 'wav', 'ogg', 'aac'];
    
    let icon = 'fa-file';
    let color = '#888';
    
    if (imageExts.includes(ext)) {
        icon = 'fa-image';
        color = '#4CAF50';
    } else if (pdfExts.includes(ext)) {
        icon = 'fa-file-pdf';
        color = '#f44336';
    } else if (docExts.includes(ext)) {
        icon = 'fa-file-word';
        color = '#2196F3';
    } else if (xlsExts.includes(ext)) {
        icon = 'fa-file-excel';
        color = '#4CAF50';
    } else if (zipExts.includes(ext)) {
        icon = 'fa-file-archive';
        color = '#FF9800';
    } else if (videoExts.includes(ext)) {
        icon = 'fa-file-video';
        color = '#9C27B0';
    } else if (audioExts.includes(ext)) {
        icon = 'fa-file-audio';
        color = '#00BCD4';
    }
    
    return { icon, color };
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Initialize Supabase client
function initSupabase() {
    if (typeof window.supabase !== 'undefined' && 
        window.SUPABASE_URL && 
        window.SUPABASE_ANON_KEY) {
        supabaseClient = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_ANON_KEY
        );
        return true;
    }
    return false;
}

// Render upload list
function renderUploadList() {
    const uploadList = document.getElementById('uploadList');
    uploadList.innerHTML = filesToUpload.map((file, index) => {
        const { icon, color } = getFileTypeInfo(file);
        return `
            <div class="upload-item" data-index="${index}">
                <div class="upload-item-icon" style="background: ${color}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="upload-item-info">
                    <div class="upload-item-name">${file.name}</div>
                    <div class="upload-item-size">${formatFileSize(file.size)}</div>
                    <div class="upload-item-progress">
                        <div class="upload-item-progress-bar" id="progress-${index}"></div>
                    </div>
                </div>
                <button class="upload-item-preview" data-index="${index}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="upload-item-remove" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');
    
    // Add remove button listeners
    document.querySelectorAll('.upload-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            filesToUpload.splice(index, 1);
            renderUploadList();
        });
    });
    
    // Add preview button listeners
    document.querySelectorAll('.upload-item-preview').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            openPreview(null, filesToUpload[index]);
        });
    });
}

// Render uploaded files list
function renderUploadedList() {
    const uploadedList = document.getElementById('uploadedList');
    if (uploadedFilesList.length === 0) {
        uploadedList.innerHTML = '<p style="color: #888; text-align: center;">No files uploaded yet</p>';
        return;
    }
    uploadedList.innerHTML = uploadedFilesList.map((file) => {
        const { icon, color } = getFileTypeInfo(file);
        return `
            <div class="uploaded-item">
                <div class="uploaded-item-icon" style="background: ${color}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="uploaded-item-info">
                    <div class="uploaded-item-name">${file.name}</div>
                    <a href="${file.url}" target="_blank" class="uploaded-item-link">
                        ${file.url}
                    </a>
                </div>
                <button class="uploaded-item-preview" data-index="${uploadedFilesList.indexOf(file)}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="uploaded-item-copy" data-url="${file.url}">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
        `;
    }).join('');
    
    // Add copy button listeners
    document.querySelectorAll('.uploaded-item-copy').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const url = e.currentTarget.dataset.url;
            try {
                await navigator.clipboard.writeText(url);
                e.currentTarget.innerHTML = '<i class="fas fa-check"></i>';
                setTimeout(() => {
                    e.currentTarget.innerHTML = '<i class="fas fa-copy"></i>';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy', err);
            }
        });
    });
    
    // Add preview button listeners
    document.querySelectorAll('.uploaded-item-preview').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            openPreview(null, uploadedFilesList[index]);
        });
    });
}

// Helper function to check if it's a HEIC/HEIF file
function isHeicFile(file) {
    return file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif') || (file.type && (file.type.includes('heic') || file.type.includes('heif')));
}

// Upload a single file
async function uploadFile(file, index) {
    const progressBar = document.getElementById(`progress-${index}`);
    const edgeFunctionUrl = `${window.SUPABASE_URL}/functions/v1/convert-heic`;
    const bucket = window.SUPABASE_BUCKET || 'HOVB';
    
    try {
        // --- 1. TRY EDGE FUNCTION FIRST (for HEIC conversion) ---
        if (isHeicFile(file)) {
            try {
                console.log('🚀 Using Edge Function for HEIC conversion!');
                const formData = new FormData();
                formData.append('image', file);
                formData.append('pathPrefix', 'uploads');
                
                const response = await fetch(edgeFunctionUrl, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'Authorization': `Bearer ${window.SUPABASE_ANON_KEY}`
                    }
                });
                
                if (response.ok) {
                    const result = await response.json();
                    if (progressBar) {
                        progressBar.style.width = '100%';
                    }
                    console.log('✅ Edge Function upload successful!', result);
                    return {
                        name: file.name.replace(/\.(heic|heif)$/i, '.jpg'),
                        url: result.url
                    };
                }
            } catch (edgeErr) {
                console.warn('⚠️ Edge Function failed, falling back to direct upload:', edgeErr);
            }
        }
        
        // --- 2. FALLBACK: DIRECT UPLOAD (with client-side conversion if possible) ---
        if (!supabaseClient) {
            alert('Supabase not configured!');
            return null;
        }
        
        // Try client-side conversion first
        let uploadFileObj = file;
        if (isHeicFile(file)) {
            try {
                console.log('📸 Trying client-side conversion...');
                if (typeof window.heic2any === 'undefined') {
                    // Dynamically load heic2any
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://unpkg.com/heic2any@0.0.10/dist/heic2any.min.js';
                        script.onload = resolve;
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                }
                
                const jpegBlob = await window.heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 0.9
                });
                uploadFileObj = new File([Array.isArray(jpegBlob) ? jpegBlob[0] : jpegBlob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
                console.log('✅ Client-side conversion successful!');
            } catch (clientConvertErr) {
                console.warn('⚠️ Client-side conversion failed, using original:', clientConvertErr);
            }
        }
        
        const path = `uploads/${Date.now()}_${uploadFileObj.name.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
        const { data, error } = await supabaseClient.storage.from(bucket).upload(path, uploadFileObj, {
            upsert: true
        });
        
        if (error) {
            throw error;
        }
        
        // Update progress bar to 100%
        if (progressBar) {
            progressBar.style.width = '100%';
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabaseClient.storage.from(bucket).getPublicUrl(path);
        
        return {
            name: uploadFileObj.name,
            url: publicUrl
        };
    } catch (err) {
        console.error('Upload failed', err);
        alert(`Failed to upload ${file.name}: ${err.message}`);
        return null;
    }
}

// Upload all files
async function uploadAllFiles() {
    if (filesToUpload.length === 0) {
        alert('No files to upload!');
        return;
    }
    
    const uploadAllBtn = document.getElementById('uploadAllBtn');
    uploadAllBtn.disabled = true;
    uploadAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    
    const uploaded = [];
    for (let i = 0; i < filesToUpload.length; i++) {
        const result = await uploadFile(filesToUpload[i], i);
        if (result) {
            uploaded.push(result);
        }
    }
    
    // Add to uploaded files list
    uploadedFilesList = [...uploaded, ...uploadedFilesList];
    renderUploadedList();
    
    // Clear files to upload
    filesToUpload = [];
    renderUploadList();
    
    uploadAllBtn.disabled = false;
    uploadAllBtn.innerHTML = '<i class="fas fa-upload"></i> Upload All';
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Supabase
    if (!initSupabase()) {
        console.warn('Supabase not configured yet');
    }
    
    // Load recent uploaded files from localStorage
    const savedUploads = localStorage.getItem('hov_uploaded_files');
    if (savedUploads) {
        uploadedFilesList = JSON.parse(savedUploads);
        renderUploadedList();
    }
    
    // Setup dropzone
    const dropzone = document.getElementById('uploadDropzone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const clearBtn = document.getElementById('clearBtn');
    const uploadAllBtn = document.getElementById('uploadAllBtn');
    const previewModalClose = document.getElementById('previewModalClose');
    const previewModalBackdrop = document.getElementById('previewModalBackdrop');
    
    // Preview modal close listeners
    previewModalClose.addEventListener('click', closePreview);
    previewModalBackdrop.addEventListener('click', closePreview);
    
    // Browse button click
    browseBtn.addEventListener('click', () => {
        fileInput.click();
    });
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            filesToUpload = [...filesToUpload, ...Array.from(e.target.files)];
            renderUploadList();
        }
    });
    
    // Drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, highlight, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropzone.classList.add('drag-over');
    }
    function unhighlight() {
        dropzone.classList.remove('drag-over');
    }
    
    dropzone.addEventListener('drop', handleDrop, false);
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            filesToUpload = [...filesToUpload, ...Array.from(files)];
            renderUploadList();
        }
    }
    
    // Clear button
    clearBtn.addEventListener('click', () => {
        filesToUpload = [];
        renderUploadList();
    });
    
    // Upload all button
    uploadAllBtn.addEventListener('click', uploadAllFiles);
    
    // Save uploaded files to localStorage when updated
    const originalRenderUploadedList = renderUploadedList;
    renderUploadedList = function() {
        originalRenderUploadedList.apply(this);
        localStorage.setItem('hov_uploaded_files', JSON.stringify(uploadedFilesList));
    };
});