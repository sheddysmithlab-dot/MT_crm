import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { toast } from 'sonner';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { dbOperations } from '@/lib/db';

const CategoryForm = ({ category, onSave, onCancel }) => {
  const [formData, setFormData] = useState(
    category || {
      name: '',
      description: '',
    }
  );

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Category name is required.');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Category Name *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Hardware, Steel, Paints"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows="2"
          placeholder="Optional description"
          className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-dark-card dark:border-gray-600 dark:text-dark-text focus:ring-2 focus:ring-brand-red"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{category ? 'Update Category' : 'Add Category'}</Button>
      </div>
    </form>
  );
};

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await dbOperations.getAll('inventory_categories');
      const sorted = (data || []).sort((a, b) => String(a.name).localeCompare(String(b.name)));
      setCategories(sorted);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (categoryData) => {
    try {
      const existing = categories.find(
        (c) => c.name.toLowerCase() === categoryData.name.toLowerCase()
      );
      if (existing) {
        toast.error('Category already exists!');
        return;
      }

      await dbOperations.insert('inventory_categories', categoryData);

      toast.success('Category added successfully!');
      setIsModalOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const handleUpdateCategory = async (categoryData) => {
    try {
      const existing = categories.find(
        (c) =>
          c.name.toLowerCase() === categoryData.name.toLowerCase() &&
          c.id !== editingCategory.id
      );
      if (existing) {
        toast.error('Category already exists!');
        return;
      }

      await dbOperations.update('inventory_categories', editingCategory.id, categoryData);

      toast.success('Category updated successfully!');
      setIsModalOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategory = async () => {
    try {
      await dbOperations.delete('inventory_categories', categoryToDelete.id);

      toast.success(`Category "${categoryToDelete.name}" deleted successfully.`);
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category. It may be in use by inventory items.');
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red"></div>
          <span className="ml-3 text-gray-600 dark:text-dark-text-secondary">Loading categories...</span>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCategory(null);
        }}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
      >
        <CategoryForm
          category={editingCategory}
          onSave={editingCategory ? handleUpdateCategory : handleAddCategory}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingCategory(null);
          }}
        />
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`}
      />

      <Card>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">Manage Categories</h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Organize your inventory items by categories
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-left">
              <tr>
                <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">S.No</th>
                <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Category Name</th>
                <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300">Description</th>
                <th className="py-1 px-2 font-semibold text-gray-700 dark:text-gray-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length > 0 ? (
                categories.map((category, index) => (
                  <tr
                    key={category.id}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="py-1 px-2 text-gray-700 dark:text-dark-text-secondary">{index + 1}</td>
                    <td className="py-1 px-2 font-medium text-gray-900 dark:text-dark-text">
                      {category.name}
                    </td>
                    <td className="py-1 px-2 text-gray-700 dark:text-dark-text-secondary">
                      {category.description || '-'}
                    </td>
                    <td className="py-1 px-2 text-right">
                      <div className="flex justify-end items-center space-x-2">
                        <Button
                          variant="ghost"
                          className="p-2 h-auto"
                          onClick={() => {
                            setEditingCategory(category);
                            setIsModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          className="p-2 h-auto"
                          onClick={() => {
                            setCategoryToDelete(category);
                            setIsDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-4">
                    <div className="flex flex-col items-center text-gray-500 dark:text-dark-text-secondary">
                      <p className="text-lg font-medium">No categories found</p>
                      <p className="text-sm mt-1">Add your first category to start organizing inventory</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {categories.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 dark:text-dark-text-secondary">
            Total {categories.length} category(ies)
          </div>
        )}
      </Card>
    </div>
  );
};

export default CategoryManager;
