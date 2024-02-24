import { Separator, input, select, confirm } from '@inquirer/prompts';
import { CliSelectOption } from './type';

type Choice = CliSelectOption | Separator;

export class CliIO {
  public async chat(def?: string) {
    return this.input(this.genMsgChat(), def);
  }

  public async select(message: string, options: string[] | CliSelectOption[], needTailingSeparator = false) {
    let choices: Choice[] = options.map((option: string | CliSelectOption) => {
      if (typeof option === 'string') {
        // string
        return { name: option, value: option };
      } else {
        return option;
      }
    });
    if (needTailingSeparator) {
      choices = [...choices, new Separator()];
    }
    return select({
      message,
      choices,
    });
  }

  public async input(message: string, def?: string) {
    return input({ message, default: def });
  }

  public async confirmInput(input: string): Promise<boolean> {
    return confirm({ message: `Confirm your input: ${input}`, default: true });
  }

  private genMsgChat() {
    return 'Chat:';
  }

  public genMsgHelp() {
    let help = '';

    help += 'Type anything you want to chat with OpenAI API.\n';
    help += 'Some "Reserved Words" are used as "Commands":\n';
    help += 'Input "cmd" to list all available commands for you to choose.\n';
    help += 'Input "models" to list and select the OpenAI model you want to choose.\n';
    help += 'Input "assistants" to list and select the assistant mode you want to choose.\n';
    help += 'Input "langs" to list and select the target translation language.\n';
    help += 'Input "log" to list and select the log type.\n';
    help += 'Input "temperature" to edit the AI temperature [0.1 - 1.0, e.g 0.2~0.8].';
    help += 'Input "status" to show current cli app status.\n';
    help += 'Input "speak" to speak last chat answer.\n';
    help += 'Input "reprint" to print readable QA history of current session in console.';
    help += 'Input "session" to show all the detailed (req + res) chat history of current session.\n';
    help += 'Input "historyList" to list all the available histories in vault.\n';
    help += 'Input "historyLoad" to list and select the history into current session from vault.\n';
    help += 'Input "reset" to clear all existing historical histories, like starting a new session.\n';
    help += 'Input "save" to save chat history to vault.\n';
    help += 'Input "limit" to fetch latest API limit status from OpenAI.\n';
    help += 'Input "confirm" to list and select the confirm type.\n';
    help += 'Input "help" to print this help message.\n';
    help += 'Input "exit" to exit app.\n';

    return help;
  }
}
