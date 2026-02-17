import { Op, literal, fn, col, Sequelize } from "sequelize";
import Tag from "../../models/Tag";
import ContactTag from "../../models/ContactTag";
import TicketTag from "../../models/TicketTag";

import removeAccents from "remove-accents";
import Contact from "../../models/Contact";

interface Request {
  companyId: number;
  searchParam?: string;
  pageNumber?: string | number;
  kanban?: number;
  tagId?: number;
  limit?: string | number;
}

interface Response {
  tags: Tag[];
  count: number;
  hasMore: boolean;
}

const ListService = async ({
  companyId,
  searchParam = "",
  pageNumber = "1",
  kanban,
  tagId = 0,
  limit: rawLimit
}: Request): Promise<Response> => {
  const whereCondition: any = { companyId };

  if (kanban !== undefined && kanban !== null) {
    whereCondition.kanban = kanban;
  }

  // Resolve limit and offset. If limit is 'all' or -1, fetch everything
  const limitParam = typeof rawLimit === "string" ? rawLimit : rawLimit?.toString();
  const unlimited = limitParam === "all" || limitParam === "-1";
  const limit = unlimited ? undefined : Number(limitParam || 20);
  const offset = unlimited ? undefined : (limit as number) * (+pageNumber - 1);

  const sanitizedSearchParam = removeAccents(searchParam.toLocaleLowerCase().trim());

  if (searchParam) {
    whereCondition[Op.or] = [
      {
        name: Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("Tag.name")),
          "LIKE",
          `%${sanitizedSearchParam}%`
        )
      },
      { color: { [Op.like]: `%${sanitizedSearchParam}%` } }
    ];
  }

  if (tagId > 0) {
    whereCondition.id = { [Op.ne]: [tagId] };
  }

  // If we are looking for Kanban lanes specifically (kanban === 1), use the TicketTag branch
  if (Number(kanban) === 1) {
    const { count, rows: tags } = await Tag.findAndCountAll({
      where: whereCondition,
      ...(limit !== undefined ? { limit } : {}),
      ...(offset !== undefined ? { offset } : {}),
      order: [["name", "ASC"]],
      include: [
        {
          model: TicketTag,
          as: "ticketTags",
        },
      ],
      attributes: ['id', 'name', 'color', 'kanban'],
    });

    const hasMore = unlimited ? false : count > (offset as number) + tags.length;

    return { tags, count, hasMore };
  } else {
    // Default branch (kanban === 0 or undefined) - includes Contact count
    const { count, rows: tags } = await Tag.findAndCountAll({
      where: whereCondition,
      ...(limit !== undefined ? { limit } : {}),
      include: [
        {
          model: Contact,
          as: "contacts",
        },
      ],
      attributes: ['id', 'name', 'color', 'kanban'],
      ...(offset !== undefined ? { offset } : {}),
      order: [["name", "ASC"]],
    });

    const hasMore = unlimited ? false : count > (offset as number) + tags.length;

    return { tags, count, hasMore };
  }
};

export default ListService;
