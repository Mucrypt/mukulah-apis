const { Op } = require('sequelize');
const Category = require('../models/entities/Category');

class NestedSetService {
  /**
   * Rebuild the nested set tree.
   * @param {Array} nodes - The list of nodes to process.
   * @param {number|null} parentId - The parent ID of the current node.
   * @param {number} left - The left value for the current node.
   * @param {number} depth - The depth of the current node.
   * @returns {number} - The right value after processing the tree.
   */
  static async rebuildTree(nodes, parentId = null, left = 1, depth = 0) {
    let right = left + 1;

    for (const node of nodes) {
      // Get the node's children
      const children = node.children || [];

      // Process children recursively
      if (children.length > 0) {
        right = await this.rebuildTree(children, node.id, left + 1, depth + 1);
      }

      // Update the current node
      await Category.update(
        {
          parent_id: parentId,
          lft: left,
          rgt: right,
          depth: depth,
        },
        {
          where: { id: node.id },
        }
      );

      left = right + 1;
      right = left + 1;
    }

    return right;
  }

  /**
   * Build a tree structure from a flat list of categories.
   * @param {Array} nodes - The flat list of categories.
   * @param {number|null} parentId - The parent ID to start building the tree from.
   * @returns {Array} - The tree structure.
   */
  static buildTree(nodes, parentId = null) {
    return nodes
      .filter((node) => node.parent_id === parentId)
      .map((node) => ({
        id: node.id,
        parent_id: node.parent_id,
        children: this.buildTree(nodes, node.id),
      }));
  }

  /**
   * Get the full tree of categories ordered by `lft`.
   * @returns {Promise<Array>} - The full tree of categories.
   */
  static async getFullTree() {
    return Category.findAll({
      order: [['lft', 'ASC']],
    });
  }

  /**
   * Get a subtree of categories under a specific parent.
   * @param {number} parentId - The ID of the parent category.
   * @returns {Promise<Array>} - The subtree of categories.
   */
  static async getSubtree(parentId) {
    const parent = await Category.findByPk(parentId);
    if (!parent) return [];

    return Category.findAll({
      where: {
        lft: { [Op.gt]: parent.lft },
        rgt: { [Op.lt]: parent.rgt },
      },
      order: [['lft', 'ASC']],
    });
  }
}

module.exports = NestedSetService;
