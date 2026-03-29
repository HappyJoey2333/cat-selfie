/**
 * 照片管理器
 * 负责照片存储、预览和保存
 */
class GalleryManager {
  constructor() {
    this.photos = [];          // { id, dataUrl, timestamp }
    this.selectedIds = new Set();
    this.currentPreviewId = null;

    // DOM 元素
    this.panel = document.getElementById('gallery-panel');
    this.grid = document.getElementById('gallery-grid');
    this.emptyMsg = document.getElementById('gallery-empty');
    this.btnGallery = document.getElementById('btn-gallery');
    this.badge = document.getElementById('gallery-badge');
    this.previewModal = document.getElementById('preview-modal');
    this.previewImage = document.getElementById('preview-image');
    this.galleryThumb = this.btnGallery.querySelector('.gallery-thumb');

    this._bindEvents();
  }

  /** 添加一组连拍照片 */
  addPhotos(dataUrls) {
    const timestamp = Date.now();
    dataUrls.forEach((dataUrl, i) => {
      this.photos.push({
        id: `${timestamp}-${i}`,
        dataUrl,
        timestamp: timestamp + i,
      });
    });
    this._updateBadge();
    this._updateThumbnail();
  }

  /** 获取照片总数 */
  get count() {
    return this.photos.length;
  }

  /** 打开相册面板 */
  open() {
    this.panel.classList.remove('hidden');
    this.selectedIds.clear();
    this._renderGrid();
  }

  /** 关闭相册面板 */
  close() {
    this.panel.classList.add('hidden');
    this.previewModal.classList.add('hidden');
  }

  /** 保存选中的照片 */
  saveSelected() {
    const selected = this.photos.filter(p => this.selectedIds.has(p.id));
    selected.forEach(photo => this._downloadPhoto(photo));
  }

  /** 绑定事件 */
  _bindEvents() {
    // 返回按钮
    document.getElementById('btn-gallery-back').addEventListener('click', () => this.close());

    // 全选
    document.getElementById('btn-select-all').addEventListener('click', () => {
      if (this.selectedIds.size === this.photos.length) {
        // 已全选则取消全选
        this.selectedIds.clear();
      } else {
        this.photos.forEach(p => this.selectedIds.add(p.id));
      }
      this._renderGrid();
      this._updateSaveButton();
    });

    // 保存选中
    document.getElementById('btn-save-selected').addEventListener('click', () => {
      this.saveSelected();
    });

    // 大图预览操作
    document.getElementById('btn-preview-close').addEventListener('click', () => {
      this.previewModal.classList.add('hidden');
    });

    document.getElementById('btn-preview-save').addEventListener('click', () => {
      const photo = this.photos.find(p => p.id === this.currentPreviewId);
      if (photo) this._downloadPhoto(photo);
    });

    document.getElementById('btn-preview-delete').addEventListener('click', () => {
      if (this.currentPreviewId) {
        this._deletePhoto(this.currentPreviewId);
        this.previewModal.classList.add('hidden');
        this._renderGrid();
      }
    });

    // 相册入口按钮
    this.btnGallery.addEventListener('click', () => this.open());
  }

  /** 渲染网格 */
  _renderGrid() {
    this.grid.innerHTML = '';
    this.emptyMsg.classList.toggle('hidden', this.photos.length > 0);
    this.grid.classList.toggle('hidden', this.photos.length === 0);

    this.photos.forEach(photo => {
      const item = document.createElement('div');
      item.className = 'gallery-item' + (this.selectedIds.has(photo.id) ? ' selected' : '');

      const img = document.createElement('img');
      img.src = photo.dataUrl;
      img.alt = '照片';
      img.loading = 'lazy';

      const checkMark = document.createElement('div');
      checkMark.className = 'check-mark';

      item.appendChild(img);
      item.appendChild(checkMark);

      // 点击选择
      item.addEventListener('click', (e) => {
        if (this.selectedIds.has(photo.id)) {
          this.selectedIds.delete(photo.id);
          item.classList.remove('selected');
        } else {
          this.selectedIds.add(photo.id);
          item.classList.add('selected');
        }
        this._updateSaveButton();
      });

      // 长按预览
      let longPressTimer = null;
      item.addEventListener('pointerdown', (e) => {
        longPressTimer = setTimeout(() => {
          e.preventDefault();
          this._showPreview(photo.id);
        }, 500);
      });
      item.addEventListener('pointerup', () => clearTimeout(longPressTimer));
      item.addEventListener('pointerleave', () => clearTimeout(longPressTimer));

      this.grid.appendChild(item);
    });

    this._updateSaveButton();
  }

  /** 显示大图预览 */
  _showPreview(photoId) {
    const photo = this.photos.find(p => p.id === photoId);
    if (!photo) return;
    this.currentPreviewId = photoId;
    this.previewImage.src = photo.dataUrl;
    this.previewModal.classList.remove('hidden');
  }

  /** 下载照片 */
  _downloadPhoto(photo) {
    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = `cat-selfie-${photo.timestamp}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /** 删除照片 */
  _deletePhoto(photoId) {
    this.photos = this.photos.filter(p => p.id !== photoId);
    this.selectedIds.delete(photoId);
    this._updateBadge();
    this._updateThumbnail();
    if (this.photos.length === 0) {
      this.btnGallery.classList.add('hidden');
    }
  }

  /** 更新徽章数字 */
  _updateBadge() {
    this.badge.textContent = this.photos.length;
    this.btnGallery.classList.toggle('hidden', this.photos.length === 0);
  }

  /** 更新缩略图 */
  _updateThumbnail() {
    if (this.photos.length > 0) {
      this.galleryThumb.style.backgroundImage = `url(${this.photos[this.photos.length - 1].dataUrl})`;
    }
  }

  /** 更新保存按钮状态 */
  _updateSaveButton() {
    const btn = document.getElementById('btn-save-selected');
    btn.disabled = this.selectedIds.size === 0;
    btn.textContent = this.selectedIds.size > 0
      ? `保存 (${this.selectedIds.size})`
      : '保存';
  }
}
