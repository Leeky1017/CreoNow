# Document Management Specification Delta

## Change: s3-export

### Requirement: 文档导出必须补齐 Markdown/TXT/DOCX 三格式能力 [MODIFIED]

文档导出链路必须支持 Markdown、TXT、DOCX 三种格式，并保持导出结果与请求输入的一致性。

#### Scenario: S3-EXPORT-S1 文档导出为 Markdown [MODIFIED]

- **假设** 用户选择导出当前文档为 Markdown
- **当** 系统执行导出
- **则** 生成 `.md` 文件并保留标题与段落结构
- **并且** 导出完成后返回成功响应与目标路径

#### Scenario: S3-EXPORT-S2 文档导出为 TXT 与 DOCX [ADDED]

- **假设** 用户分别选择 TXT 与 DOCX 导出
- **当** 系统执行对应导出流程
- **则** 生成 `.txt` 与 `.docx` 文件
- **并且** 文件内容与输入文档语义一致

### Requirement: 导出失败必须显式上报，不得静默降级 [ADDED]

导出失败场景必须返回明确错误并在界面可见，禁止以空文件、默认成功或吞错方式掩盖失败。

#### Scenario: S3-EXPORT-S3 导出失败时返回显式错误并提示用户 [ADDED]

- **假设** 目标路径不可写或格式转换失败
- **当** 导出流程结束
- **则** 返回明确错误码与错误信息
- **并且** UI 显示失败提示
- **并且** 不产生“导出成功”假提示

## Out of Scope

- 新增 PDF/HTML/EPUB 等格式
- 项目级 bundle 导出协议重构
- 文档存储层与文件树结构改造
