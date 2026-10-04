"""语言小节更新不可覆盖其他正文，重复运行不能产生重复章节。"""
import runpy
import unittest
from pathlib import Path

merge = runpy.run_path(str(Path(__file__).resolve().parents[1] / 'scripts/sync-readme-sections.py'))['merge_section']

class ReadmeSections(unittest.TestCase):
    original = '# 项目\n\n语言导航\n\n## 原有正文\n保留内容\n'
    source = '# 标题\n\n## 交互版本 · IJ-01\n新功能\n\n## 其他\n其他内容\n'
    def test_preserve_body_and_navigation(self):
        result = merge(self.original, self.source)
        self.assertTrue(result.startswith('# 项目\n\n语言导航\n\n'))
        self.assertTrue(result.endswith('## 原有正文\n保留内容\n'))
        self.assertNotIn('其他内容', result)
    def test_idempotent_and_upgrade(self):
        result = merge(self.original, self.source)
        self.assertEqual(merge(result, self.source), result)
        upgrade = merge(result, self.source.replace('IJ-01', 'IJ-02'))
        self.assertNotIn('IJ-01', upgrade)
        self.assertEqual(upgrade.count('IJ-02'), 1)
    def test_invalid_sections_are_rejected(self):
        with self.assertRaises(ValueError): merge(self.original, '# 无交互说明')
        with self.assertRaises(ValueError): merge(self.original, self.source + self.source)
        with self.assertRaises(ValueError): merge('# 缺少完整正文', self.source)
    def test_japanese(self):
        source = self.source.replace('交互版本', 'インタラクティブ版')
        self.assertIn('インタラクティブ版 · IJ-01', merge(self.original, source))

if __name__ == '__main__':
    unittest.main()
