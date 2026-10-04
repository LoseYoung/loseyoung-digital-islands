"""仅同步语言分支的交互版本小节，保留已有完整说明和分支语言导航。"""
import re
import subprocess
import tempfile
from pathlib import Path

SECTION = re.compile(r'^## (?:Interactive edition|交互版本|インタラクティブ版) · IJ-\d+\s*\n.*?(?=^## |\Z)', re.M | re.S)

def merge_section(original: str, translated: str) -> str:
    sections = list(SECTION.finditer(translated))
    if len(sections) != 1:
        raise ValueError('源文档必须包含一个交互版本小节')
    replacement = sections[0].group().rstrip() + '\n\n'
    old = list(SECTION.finditer(original))
    if len(old) > 1:
        raise ValueError('目标文档有重复交互版本小节，停止自动覆盖')
    if old:
        return original[:old[0].start()] + replacement + original[old[0].end():]
    heading = re.search(r'^## ', original, re.M)
    if not heading:
        raise ValueError('目标文档缺少完整 README 章节，停止自动覆盖')
    return original[:heading.start()] + replacement + original[heading.start():]


def main():
    # 固定来源、分支及文件；不解释来自输入的任意 shell 命令，也不强制推送。
    repo = Path.cwd()
    for branch, filename in [('doc-zh', 'README.zh-CN.md'), ('doc-ja', 'README.ja.md')]:
        translated = (repo / filename).read_text(encoding='utf8')
        subprocess.run(['git', 'fetch', '--no-tags', 'origin', f'refs/heads/{branch}:refs/remotes/origin/{branch}'], check=True)
        original = subprocess.check_output(['git', 'show', f'origin/{branch}:README.md'], text=True)
        updated = merge_section(original, translated)
        assert merge_section(updated, translated) == updated, '同步必须幂等'
        if original == updated:
            print(f'{branch} 交互说明已是最新，无需提交。', flush=True)
            continue
        with tempfile.TemporaryDirectory(prefix='readme-language-') as temp:
            work = Path(temp) / 'tree'
            subprocess.run(['git', 'worktree', 'add', '--detach', str(work), f'origin/{branch}'], check=True)
            try:
                (work / 'README.md').write_text(updated, encoding='utf8')
                subprocess.run(['git', 'add', 'README.md'], cwd=work, check=True)
                changed = subprocess.check_output(['git', 'diff', '--cached', '--name-only'], cwd=work, text=True).strip()
                assert changed == 'README.md', '语言同步只能修改 README'
                subprocess.run(['git', '-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'commit', '-m', f'docs: 同步{branch}分支的交互版本说明'], cwd=work, check=True)
                subprocess.run(['git', 'push', 'origin', f'HEAD:refs/heads/{branch}'], cwd=work, check=True)
            finally:
                subprocess.run(['git', 'worktree', 'remove', '--force', str(work)], check=True)
        print(f'{branch} 交互说明已同步，其他正文保持不变。', flush=True)

if __name__ == '__main__':
    main()
