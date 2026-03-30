# Fix Menu Item Update Image Removal Issue

## Steps:
- [x] Step 0: Analyzed files and confirmed root cause in menu-item-dialog.component.ts onSubmit()
- [x] Step 1: Edit `frontend/src/app/components/admin/menu-management/menu-item-dialog.component.ts`:
  * In onSubmit(): Preserve `image: this.data.editingItem.image` when editing + no new image selected
  * Fix getImageUrl(): Import and use `environment.apiUrl` consistently (path fixed to '../../../../environments/environment')
- [ ] Step 2: Test update without image change → image should persist
- [ ] Step 3: Mark complete

**Next Action**: Test the fix (Step 2)
