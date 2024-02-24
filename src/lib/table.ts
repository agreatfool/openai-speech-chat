import { HistoryListTableData } from './type';
import * as dayjs from 'dayjs';

const Table = require('cli-table');

export class HistoryListTable {
  private table;

  constructor(files: HistoryListTableData[]) {
    this.table = new Table({ head: ['Year', 'Datetime', 'Length', 'Summary'] });

    files.sort((a, b) => {
      return parseInt(b.timestamp) - parseInt(a.timestamp); // desending by timestamp
    });

    for (const item of files) {
      const { timestamp, file } = item;
      const { summary, history } = file;
      const dayjsInstance = dayjs.unix(parseInt(timestamp));
      const row = [
        dayjsInstance.format('YYYY'),
        dayjsInstance.format('MM-DD HH:mm:ss'),
        history.length.toString(),
        summary,
      ];
      this.table.push(row);
    }
  }

  public toString() {
    return this.table.toString();
  }
}
