import { ALL_ENTITIES_ARRAY } from './all-entities.array.js';

/**
 * Danh sách entity dạng **mảng tường minh** để truyền vào
 * `TypeOrmModule.forRoot({ entities })`.
 *
 * Vì sao không dùng glob `__dirname + '/**\/*.entity{.ts,.js}'`:
 * - Glob dễ nạp nhầm file khi build (`dist` + `src` cùng tồn tại).
 * - Với `type: module` + `moduleResolution: nodenext`, glob đòi đường dẫn tuyệt đối
 *   và không báo lỗi khi thiếu entity ⇒ lỗi quan hệ chỉ xuất hiện lúc runtime.
 *
 * Danh sách tường minh giúp TypeScript báo ngay khi thêm entity mới mà quên khai báo.
 */
export const ALL_ENTITIES = ALL_ENTITIES_ARRAY;