import copy
import random

SIZE = 9
EMPTY = 0

DIFFICULTY_CLUES = {
    'easy': 40,
    'medium': 32,
    'hard': 24,
}


def deep_copy(board):
    return copy.deepcopy(board)


def create_empty_board():
    return [[EMPTY for _ in range(SIZE)] for _ in range(SIZE)]


def is_safe(board, row, col, num):
    for x in range(SIZE):
        if board[row][x] == num or board[x][col] == num:
            return False
    start_row = row - row % 3
    start_col = col - col % 3
    for i in range(3):
        for j in range(3):
            if board[start_row + i][start_col + j] == num:
                return False
    return True


def fill_board(board):
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                possible = list(range(1, SIZE + 1))
                random.shuffle(possible)
                for candidate in possible:
                    if is_safe(board, row, col, candidate):
                        board[row][col] = candidate
                        if fill_board(board):
                            return True
                        board[row][col] = EMPTY
                return False
    return True


def count_solutions(board, limit=2):
    empty_cell = None
    for row in range(SIZE):
        for col in range(SIZE):
            if board[row][col] == EMPTY:
                empty_cell = (row, col)
                break
        if empty_cell is not None:
            break

    if empty_cell is None:
        return 1

    row, col = empty_cell
    solutions = 0
    for candidate in random.sample(list(range(1, SIZE + 1)), SIZE):
        if is_safe(board, row, col, candidate):
            board[row][col] = candidate
            solutions += count_solutions(board, limit)
            if solutions >= limit:
                board[row][col] = EMPTY
                return limit
            board[row][col] = EMPTY
    return solutions


def has_unique_solution(board):
    return count_solutions(board, limit=2) == 1


def remove_cells(board, clues):
    cells = [(row, col) for row in range(SIZE) for col in range(SIZE)]
    random.shuffle(cells)
    while len(cells) > 0:
        row, col = cells.pop()
        if board[row][col] == EMPTY:
            continue
        value = board[row][col]
        board[row][col] = EMPTY
        if not has_unique_solution(board):
            board[row][col] = value
        if sum(cell != EMPTY for row_values in board for cell in row_values) <= clues:
            break


def generate_puzzle(clues=None, difficulty='medium'):
    board = create_empty_board()
    fill_board(board)
    solution = deep_copy(board)
    puzzle = deep_copy(board)

    if clues is None:
        clues = DIFFICULTY_CLUES.get(str(difficulty).lower(), DIFFICULTY_CLUES['medium'])

    remove_cells(puzzle, clues)
    return puzzle, solution
